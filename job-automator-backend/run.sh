   #!/bin/bash
   # Find python executable
   PYTHON_PATH=$(which python3 || which python)
   echo "Using Python at: $PYTHON_PATH"
   
   # Run the app
   $PYTHON_PATH app.py
