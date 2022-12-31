# check if in venv

import sys
import venv


def main():
    if sys.prefix != sys.base_prefix:
        print("Already in a virtual environment")
        return

    venv.create(".venv", with_pip=True)
    print("Virtual environment created")


if __name__ == "__main__":
    main()
