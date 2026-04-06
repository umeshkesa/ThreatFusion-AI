import re
import requests
import concurrent.futures

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

# Read URLs from OPML
with open(r'C:\Users\kesau\Downloads\minr project(internship)\internship implem\backend\data\feeds.opml', 'r', encoding='utf-8') as f:
    content = f.read()

urls = re.findall(r'xmlUrl="([^"]+)"', content)
print(f"Checking {len(urls)} URLs...")

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
            print(f"Progress: {i+1}/{len(urls)} - Failed: {len(failed)}")

print(f"\n=== RESULTS ===")
print(f"Total: {len(urls)}")
print(f"Success: {success_count}")
print(f"Failed: {len(failed)}")

# Write failed to file
with open(r'C:\Users\kesau\Downloads\minr project(internship)\internship implem\backend\data\failed_check2.txt', 'w') as f:
    for furl in failed:
        f.write(furl + '\n')

print("Done! Failed URLs written to failed_check2.txt")
