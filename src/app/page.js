'use client';
import React, { useState } from 'react';
import { Upload, Button, Table, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

export default function Home() {
  const [data, setData] = useState([]);

  // 上传图片后的回调（暂时只做前端演示）
  const handleUpload = (info) => {
    if (info.file.status === 'done') {
      // 这里后续会对接后端，先用假数据
      const newRow = {
        key: Date.now(),
        orderId: '示例订单号',
        amount: '示例金额'
      };
      setData([...data, newRow]);
      message.success('上传成功，已添加到表格！');
    }
  };

  const columns = [
    { title: '订单号', dataIndex: 'orderId', key: 'orderId' },
    { title: '实付金额', dataIndex: 'amount', key: 'amount' }
  ];

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h2>图片识别订单号和实付金额</h2>
      <Upload
        name="file"
        showUploadList={false}
        customRequest={({ file, onSuccess }) => {
          setTimeout(() => {
            onSuccess('ok');
          }, 1000);
        }}
        onChange={handleUpload}
      >
        <Button icon={<UploadOutlined />}>上传图片</Button>
      </Upload>
      <Table
        style={{ marginTop: 24 }}
        columns={columns}
        dataSource={data}
        pagination={false}
      />
    </div>
  );
} 