#!/usr/bin/env python3
import argparse
import asyncio
import sys

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create initial owner user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    return parser.parse_args()


async def create_owner(email: str, password: str) -> int:
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none() is not None:
            raise ValueError("Email already exists")

        user = User(email=email, password_hash=hash_password(password), is_active=True)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user.id


def main() -> int:
    args = parse_args()
    try:
        user_id = asyncio.run(create_owner(args.email, args.password))
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(user_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
