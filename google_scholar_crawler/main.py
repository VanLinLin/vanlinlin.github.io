from scholarly import scholarly
import json
from datetime import datetime
import os

# 獲取當前腳本所在的目錄
script_dir = os.path.dirname(os.path.abspath(__file__))
results_dir = os.path.join(script_dir, 'results')

# 執行爬蟲
author: dict = scholarly.search_author_id(os.environ['GOOGLE_SCHOLAR_ID'])
scholarly.fill(author, sections=['basics', 'indices', 'counts', 'publications'])
name = author['name']
author['updated'] = str(datetime.now())
author['publications'] = {v['author_pub_id']:v for v in author['publications']}
print(json.dumps(author, indent=2))

# 建立目標資料夾
os.makedirs(results_dir, exist_ok=True)

# 將結果寫入檔案
with open(os.path.join(results_dir, 'gs_data.json'), 'w') as outfile:
    json.dump(author, outfile, ensure_ascii=False, indent=2)

shieldio_data = {
  "schemaVersion": 1,
  "label": "citations",
  "message": f"{author['citedby']}",
}
with open(os.path.join(results_dir, 'gs_data_shieldsio.json'), 'w') as outfile:
    json.dump(shieldio_data, outfile, ensure_ascii=False, indent=2)