#!/usr/bin/env python3
import os
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.local")
print("env_path:", env_path)
print("exists:", os.path.exists(env_path))
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if "SUPABASE_ACCESS_TOKEN" in line:
                print("found:", line[:60])
                break
