#!/usr/bin/env python3
import argparse
import sys

from auth import create_user_sync


def main():
    parser = argparse.ArgumentParser(description="Add a chatui user and print their generated login password.")
    parser.add_argument("username")
    parser.add_argument("--role", default="user", choices=["user", "admin"])
    args = parser.parse_args()

    try:
        password = create_user_sync(args.username, role=args.role)
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Created user '{args.username}' (role={args.role})")
    print(f"Password: {password}")
    print("Save this password now - it will not be shown again.")


if __name__ == "__main__":
    main()
