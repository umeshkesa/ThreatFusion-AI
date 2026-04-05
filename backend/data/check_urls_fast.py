import requests
import concurrent.futures
from urllib.parse import urlparse

def check_url(url):
    try:
        resp = requests.head(url, timeout=3, allow_redirects=True)
        if resp.status_code < 400:
            return url, True, f"OK ({resp.status_code})"
        return url, False, f"HTTP {resp.status_code}"
    except requests.exceptions.Timeout:
        return url, False, "Timeout"
    except requests.exceptions.ConnectionError:
        return url, False, "Connection Error"
    except Exception as e:
        return url, False, str(e)

# Read URLs from file
with open('C:/Users/kesau/Downloads/minr project(internship)/internship implem/backend/data/urls.txt', 'r') as f:
    urls = [line.strip() for line in f if line.strip()]

print(f"Checking {len(urls)} URLs with 20 threads...")

failed = []
success_count = 0

with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    results = executor.map(check_url, urls)
    
    for i, (url, success, msg) in enumerate(results):
        if success:
            success_count += 1
        else:
            failed.append(f"{url}|{msg}")
        
        if (i + 1) % 100 == 0:
            print(f"Progress: {i+1}/{len(urls)} - Failed so far: {len(failed)}")

print(f"\n=== RESULTS ===")
print(f"Total checked: {len(urls)}")
print(f"Success: {success_count}")
print(f"Failed: {len(failed)}")

# Write failed URLs to file
with open('C:/Users/kesau/Downloads/minr project(internship)/internship implem/backend/data/failed_urls.txt', 'w', encoding='utf-8') as f:
    for furl in failed:
        f.write(furl + '\n')

print(f"\nFailed URLs written to failed_urls.txt")
