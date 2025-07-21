import { ForwardRefExoticComponent, RefAttributes } from 'react';

export interface FileListProps {
  onSelectedFilesChange: (files: any[]) => void;
  onFileUploadComplete?: (newFiles: any[]) => void;
}

export interface FileListRef {
  clearSelection: () => void;
}

declare const FileList: ForwardRefExoticComponent<FileListProps & RefAttributes<FileListRef>>;

export default FileList; 