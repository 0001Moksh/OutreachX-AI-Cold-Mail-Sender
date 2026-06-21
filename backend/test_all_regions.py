import psycopg2

regions = [
    "eu-west-3",
    "eu-north-1",
    "ap-southeast-3",
    "ap-south-2",
    "me-central-1",
    "me-south-1",
    "af-south-1",
    "eu-south-1",
    "eu-south-2",
    "ap-northeast-3",
]

project_ref = "nhderhrbasdzdqixvcvd"
password = "tmBG_NCB7xb3um."

for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    url = f"postgresql://postgres.{project_ref}:{password}@{host}:6543/postgres"
    print(f"Testing region: {r} (host: {host})...")
    try:
        conn = psycopg2.connect(url, connect_timeout=3)
        print(f"  SUCCESS for region {r}!")
        conn.close()
        break
    except Exception as e:
        err = str(e).strip()
        print(f"  Failed: {err}")
