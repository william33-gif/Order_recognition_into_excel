import requests
import base64

# 1. 读取图片并转为base64
with open(r'C:\Users\Admin\Desktop\图片测试\xl\media\image1.jpeg', 'rb') as f:
    img_data = f.read()
img_base64 = base64.b64encode(img_data).decode()

# 2. 你的access_token
access_token = 'accee24.3a7c831bff39582d82a2d51c015130a3.2592000.1755599519.282335-119558742'

# 3. 调用百度OCR接口
url = f'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={access_token}'
headers = {'Content-Type': 'application/x-www-form-urlencoded'}
data = {'image': img_base64}

response = requests.post(url, headers=headers, data=data)
print(response.json())
