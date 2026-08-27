// import { Upload } from 'antd';
import React, { useState } from 'react';
import { API, keyToken, linkApi } from '@utils';
export function listMenuItem() {
  return [
    { name: 'Tập tin của tôi', icon: 'folder' },
    { name: 'Đã chia sẻ', icon: 'share' },
    { name: 'Thùng rác', icon: 'recycle' },
    { name: 'Tổ chức thư mục', icon: 'folder-organization' },
  ];
}
export function tabRecentlyItem() {
  return [
    { name: 'Tất cả', icon: '' },
    { name: 'Word', icon: 'work' },
    { name: 'Excel', icon: 'excel' },
    { name: 'PowerPoint', icon: 'power-point' },
    { name: 'PDF', icon: 'pdf' },
  ];
}
export const formatBytes = (bytes: number) => {
  if (bytes == 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = +Math.floor(Math.log(bytes) / Math.log(1024));
  if (i == 0) return bytes + ' ' + sizes[i];
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
};
export const getFileIcon = (extension: string) => {
  if (extension === 'Folder') return <img className="w-6 h-6" src={'/assets/svgs/folder-color.svg'} />;
  extension = extension.toLowerCase();
  const fileIcons: any = {
    '.png': 'photo-image',
    '.jpg': 'photo-image',
    '.jpeg': 'photo-image',
    '.svg': 'photo-image',
    '.mp4': 'video',
    '.avi': 'video',
    '.mpeg-4': 'video',
    '.h.264': 'video',
    '.mov': 'video',
    '.txt': 'txt',
    '.pdf': 'pdf',
    '.xls': 'excel',
    '.xlsx': 'excel',
    '.ppt': 'power-point',
    '.pptx': 'power-point',
    '.doc': 'work',
    '.docx': 'work',
    default: 'genericfile',
  };
  return <img className="w-6 h-6" src={'/assets/svgs/' + (fileIcons[extension] || fileIcons['default']) + '.svg'} />;
};
// export function listUploadItem() {
//   return [
//     {
//       label: (
//         <a
//           onClick={() => {
//             setEditNameFolder(true);
//             setValueNameEdit('');
//             setIdEditName('');
//           }}
//           className="flex items-center"
//         >
//           <img className="w-4 h-4" src={'/assets/svgs/folder-color.svg'} />
//           <p className="ml-2">Thư mục</p>
//         </a>
//       ),
//       key: '0',
//     },
//     {
//       type: 'divider',
//     },
//     {
//       label: (
//         <Upload {...propsUpload}>
//           <a className="flex items-center pr-8">
//             <img className="w-4 h-4" src={'/assets/svgs/file-upload.svg'} />
//             <p className="ml-2">Tải tệp lên</p>
//           </a>
//         </Upload>
//       ),
//       key: '1',
//     },
//     {
//       label: (
//         <Upload {...propsUpload} directory>
//           <a className="flex items-center">
//             <img className="w-4 h-4" src={'/assets/svgs/folder-upload.svg'} />
//             <p className="ml-2">Tải lên thư mục</p>
//           </a>
//         </Upload>
//       ),
//       key: '2',
//     },
//   ];
// }
export function propsUploadItem(message: any, messageLoading: any, queryParamPage: any, getDataTable: any) {
  return {
    headers: {
      authorization: localStorage.getItem(keyToken) ? 'Bearer ' + localStorage.getItem(keyToken) : '',
      'Accept-Language': localStorage.getItem('i18nextLng') || '',
    },
    multiple: true,
    showUploadList: false,
    action:
      linkApi +
      `/core/nodes/upload/physical/blob${queryParamPage?.id ? '?destinationPhysicalPath=' + queryParamPage?.id : ''}`,
    onChange(info: any) {
      const { status } = info.file;
      if (status === 'uploading') {
        messageLoading.destroy();
        messageLoading.open({
          type: 'loading',
          content: 'Hành động đang diễn ra..',
          duration: 0,
        });
      }
      if (status === 'done') {
        getDataTable();
        messageLoading.destroy();
        message.success(`${info.file.name} tải tập tin thành công.`);
      } else if (status === 'error') {
        messageLoading.destroy();
        message.error(`${info.file.name} tải tập tin lên không thành công.`);
      }
    },
    beforeUpload: async (file: any) => {
      if (file.size > 100 * 1024 * 1024) {
        message.error('Kích thước tệp vượt quá 100MB!');
        return false;
      }
      messageLoading.open({
        type: 'loading',
        content: 'Hành động đang diễn ra..',
        duration: 0,
      });
      const response = await API.post(`/files/duplicate-check`, {
        fileName: file?.name,
        path: queryParamPage?.id ? queryParamPage?.id : '',
      });
      messageLoading.destroy();
      if ((response?.data as any)?.isDuplicate === false) return true;
      message.error(`Tệp có tên ${file?.name} đã tồn tại`);
      return false;
    },
  };
}
export function propsUploadFile(message: any, messageLoading: any, docType: any) {
  return {
    headers: {
      authorization: localStorage.getItem(keyToken) ? 'Bearer ' + localStorage.getItem(keyToken) : '',
      'Accept-Language': localStorage.getItem('i18nextLng') || '',
    },
    multiple: true,
    // showUploadList: true,
    action: linkApi + `/upload/blob/${docType}`,
    onChange(info: any) {
      const { status } = info.file;
      if (status === 'uploading') {
        messageLoading.destroy();
        messageLoading.open({
          type: 'loading',
          content: 'Đang tải tập tin..',
          duration: 0,
        });
      }
      if (status === 'done') {
        messageLoading.destroy();
        message.success(`${info.file.name} tải tập tin thành công.`);
      } else if (status === 'error') {
        messageLoading.destroy();
        message.error(`${info.file.name} tải tập tin lên không thành công.`);
      }
    },
  };
}
