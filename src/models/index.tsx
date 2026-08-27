export * from './api';
export * from './data-table';
export * from './form';

export enum EStatusState {
  idle = 'idle',
  getPending = 'get.pending',
  getFulfilled = 'get.fulfilled',
  getRejected = 'get.rejected',
  getByIdPending = 'getById.pending',
  getByIdFulfilled = 'getById.fulfilled',
  getByIdRejected = 'getById.rejected',
  postPending = 'post.pending',
  postFulfilled = 'post.fulfilled',
  postRejected = 'post.rejected',
  putPending = 'put.pending',
  putFulfilled = 'put.fulfilled',
  putRejected = 'put.rejected',
  putDisablePending = 'putDisable.pending',
  putDisableFulfilled = 'putDisable.fulfilled',
  putDisableRejected = 'putDisable.rejected',
  deletePending = 'delete.pending',
  deleteFulfilled = 'delete.fulfilled',
  deleteRejected = 'delete.rejected',
}

export enum ETypeChart {
  pie = 'pie',
  ring = 'ring',
  bubble = 'bubble',
  line = 'line',
  bar = 'bar',
  stackedBar = 'stacked-bar',
  lineBar = 'line-bar',
  area = 'area',
  stackedArea = 'stacked-area',
  scatter = 'scatter',
}
export type T_Attachment = {
  fileUrl: string;
};
