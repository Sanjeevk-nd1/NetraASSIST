import logging
import os
import re
import time
import threading
from typing import Dict, List, Optional

from openai import AzureOpenAI

logger = logging.getLogger(__name__)

LLM_CONFIGS: List[Dict] = []
_CONFIGS_LOCK = threading.Lock()

# ── Client cache (one AzureOpenAI instance per endpoint) ────────────────
_CLIENT_CACHE: Dict[str, AzureOpenAI] = {}
_CLIENT_LOCK = threading.Lock()

# ── Circuit breaker state ───────────────────────────────────────────────
# Tracks per-deployment failures and cool-down windows.
# If a deployment is rate-limited, we skip it until the cool-down expires.
_CIRCUIT_STATE: Dict[str, Dict] = {}
_CIRCUIT_LOCK = threading.Lock()

# After this many consecutive failures, open the circuit (skip deployment)
_CIRCUIT_FAILURE_THRESHOLD = 3
# Default cool-down seconds when rate-limited (overridden by Retry-After header)
_CIRCUIT_DEFAULT_COOLDOWN = 30


def _build_configs():
    """Build the ordered list of LLM backend configurations from env vars."""
    global LLM_CONFIGS
    with _CONFIGS_LOCK:
        if LLM_CONFIGS:
            return

        primary_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
        primary_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
        primary_deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-5.1-prod")
        api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")

        if primary_key and primary_endpoint:
            fb1_deployment = os.environ.get(
                "AZURE_OPENAI_DEPLOYMENT_FALLBACK", primary_deployment
            )
            fb2_deployment = os.environ.get(
                "AZURE_OPENAI_DEPLOYMENT_FALLBACK_2", primary_deployment
            )

            configs = [
                {
                    "name": "primary",
                    "api_key": primary_key,
                    "endpoint": primary_endpoint,
                    "deployment": primary_deployment,
                    "api_version": api_version,
                    "max_tokens": 16384,
                    "priority": 0,
                },
                {
                    "name": "fallback_1",
                    "api_key": primary_key,
                    "endpoint": primary_endpoint,
                    "deployment": fb1_deployment,
                    "api_version": api_version,
                    "max_tokens": 16384,
                    "priority": 1,
                },
                {
                    "name": "fallback_2",
                    "api_key": primary_key,
                    "endpoint": primary_endpoint,
                    "deployment": fb2_deployment,
                    "api_version": api_version,
                    "max_tokens": 8192,
                    "priority": 2,
                },
            ]

            # Deduplicate: if fallback deployment == primary, drop duplicates
            seen_deployments = set()
            for cfg in configs:
                dep = cfg["deployment"]
                if dep not in seen_deployments:
                    seen_deployments.add(dep)
                    LLM_CONFIGS.append(cfg)
                else:
                    logger.info(
                        "Skipping duplicate deployment %s (%s)", dep, cfg["name"]
                    )


def _get_client(config: Dict) -> AzureOpenAI:
    """Return a cached AzureOpenAI client for the given config (thread-safe)."""
    cache_key = f"{config['endpoint']}|{config['api_version']}"
    with _CLIENT_LOCK:
        if cache_key not in _CLIENT_CACHE:
            _CLIENT_CACHE[cache_key] = AzureOpenAI(
                api_key=config["api_key"],
                azure_endpoint=config["endpoint"],
                api_version=config["api_version"],
            )
        return _CLIENT_CACHE[cache_key]


def _is_circuit_open(deployment: str) -> bool:
    """Check if a deployment's circuit breaker is open (should be skipped)."""
    with _CIRCUIT_LOCK:
        state = _CIRCUIT_STATE.get(deployment)
        if not state:
            return False
        if state["failures"] >= _CIRCUIT_FAILURE_THRESHOLD:
            if time.time() < state["retry_after"]:
                return True
            # Cool-down expired — half-open: allow one attempt
            state["failures"] = 0
        return False


def _record_success(deployment: str):
    """Reset circuit breaker on success."""
    with _CIRCUIT_LOCK:
        _CIRCUIT_STATE.pop(deployment, None)


def _record_failure(deployment: str, retry_after_seconds: float = 0):
    """Record a failure for a deployment. Opens circuit after threshold."""
    with _CIRCUIT_LOCK:
        state = _CIRCUIT_STATE.setdefault(deployment, {"failures": 0, "retry_after": 0})
        state["failures"] += 1
        cooldown = max(retry_after_seconds, _CIRCUIT_DEFAULT_COOLDOWN)
        state["retry_after"] = time.time() + cooldown


def _extract_retry_after(exc) -> float:
    """Try to extract Retry-After seconds from an Azure OpenAI 429 error."""
    try:
        error_str = str(exc)
        # Azure OpenAI sometimes includes "retry after X seconds" in the message
        match = re.search(r'retry\s*after\s*(\d+)', error_str, re.IGNORECASE)
        if match:
            return float(match.group(1))
        # Check for Retry-After header in response if available
        if hasattr(exc, 'response') and exc.response is not None:
            ra = exc.response.headers.get('Retry-After') or exc.response.headers.get('retry-after')
            if ra:
                return float(ra)
    except Exception:
        pass
    return 0


def chat_completion(
    messages: List[Dict],
    temperature: float = 0.2,
    max_tokens: int = 8192,
    top_p: Optional[float] = None,
) -> Dict:
    """
    Send a chat completion request through the priority-ordered fallback chain.

    Features:
    - Circuit breaker: skips rate-limited deployments until cool-down expires
    - Retry-After parsing: respects Azure's retry-after header
    - Exponential backoff on rate limits before trying next deployment

    Returns dict with keys: content, model, backend, usage.
    """
    _build_configs()
    errors: List[str] = []
    all_rate_limited = True

    for config in sorted(LLM_CONFIGS, key=lambda c: c["priority"]):
        deployment = config["deployment"]

        # Circuit breaker — skip if recently rate-limited
        if _is_circuit_open(deployment):
            logger.info("Circuit OPEN for %s (%s), skipping", config["name"], deployment)
            errors.append(f"{config['name']}({deployment}): circuit-breaker open")
            continue

        try:
            client = _get_client(config)
            effective_max = min(max_tokens, config["max_tokens"])

            kwargs = {
                "model": config["deployment"],
                "messages": messages,
                "temperature": temperature,
                "max_completion_tokens": effective_max,
            }
            if top_p is not None:
                kwargs["top_p"] = top_p

            t0 = time.time()
            response = client.chat.completions.create(**kwargs)
            elapsed = time.time() - t0

            content = response.choices[0].message.content

            # Extract token usage for diagnostics
            usage = {}
            if response.usage:
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

            logger.info(
                "LLM OK | backend=%s model=%s tokens=%s elapsed=%.1fs",
                config["name"],
                config["deployment"],
                usage.get("total_tokens", "?"),
                elapsed,
            )

            _record_success(deployment)
            all_rate_limited = False
            return {
                "content": content,
                "model": config["deployment"],
                "backend": config["name"],
                "usage": usage,
            }
        except Exception as exc:
            error_msg = str(exc)
            is_rate_limit = "429" in error_msg or "rate" in error_msg.lower()

            if is_rate_limit:
                retry_after = _extract_retry_after(exc)
                _record_failure(deployment, retry_after)
                logger.warning(
                    "LLM %s (%s) rate-limited, circuit opened for %.0fs: %s",
                    config["name"], deployment,
                    max(retry_after, _CIRCUIT_DEFAULT_COOLDOWN),
                    error_msg[:200],
                )
            else:
                all_rate_limited = False
                logger.error(
                    "LLM %s (%s) failed: %s",
                    config["name"], deployment, error_msg[:300],
                )

            errors.append(f"{config['name']}({deployment}): {error_msg[:200]}")

    # All backends failed
    if all_rate_limited:
        raise RateLimitExhausted(
            f"All LLM backends are rate-limited. Please try again in a minute. "
            f"Details: {'; '.join(errors)}"
        )
    raise Exception(f"All LLM backends failed: {'; '.join(errors)}")


class RateLimitExhausted(Exception):
    """Raised when all LLM deployments are rate-limited."""
    pass


def ask_llm_with_history(
    system_prompt: str,
    messages: List[Dict],
    temperature: float = 0.2,
    max_tokens: int = 8192,
    top_p: Optional[float] = None,
) -> Dict:
    """Prepend system prompt and call chat_completion."""
    full_messages = [{"role": "system", "content": system_prompt}]
    full_messages.extend(messages)
    return chat_completion(
        full_messages,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
