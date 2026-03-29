import os
from backend.app import app

if __name__ == '__main__':
    # Development server only. For production use:
    # gunicorn -w 4 -b 0.0.0.0:3002 --timeout 120 --threads 4 "backend.app:app"
    port = int(os.environ.get('PORT', 3002))
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
