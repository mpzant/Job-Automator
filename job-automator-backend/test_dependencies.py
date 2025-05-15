#!/usr/bin/env python
"""
Test if all required Python packages are available
"""

import sys
import importlib.util
import importlib.metadata

def check_package(package_name):
    """Check if a package is installed and get its version"""
    try:
        version = importlib.metadata.version(package_name)
        spec = importlib.util.find_spec(package_name)
        if spec is None:
            return False, None
        return True, version
    except importlib.metadata.PackageNotFoundError:
        return False, None

def main():
    """Main function to check dependencies"""
    packages = [
        'flask',
        'flask_cors',
        'werkzeug',
        'reportlab',
        'pymupdf',
    ]
    
    print("Checking required packages...")
    all_good = True
    
    for package in packages:
        installed, version = check_package(package)
        if installed:
            print(f"✓ {package} ({version})")
        else:
            print(f"✗ {package} (not installed)")
            all_good = False
    
    print("\nChecking optional packages...")
    optional_packages = [
        'gunicorn',
        'python-dotenv',
    ]
    
    for package in optional_packages:
        installed, version = check_package(package)
        if installed:
            print(f"✓ {package} ({version})")
        else:
            print(f"? {package} (not installed, but optional)")
    
    if all_good:
        print("\nAll required packages are installed! 🎉")
        return 0
    else:
        print("\nSome required packages are missing. Please install them using:")
        print("pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 