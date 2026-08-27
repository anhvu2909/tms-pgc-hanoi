import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { useAppDispatch, useTypedSelector, Action, Slice, State } from '@store';
import { CommonEntity, QueryParams } from '@models';
import { API, routerLinks } from '@utils';
import { customMessage } from '../../index';

const name = 'LaiXe';
const action = {
  ...new Action<LaiXeModel, EStatusLaiXe>(name),
  deleteMany: createAsyncThunk(name + 'deleteMany', async ({ ids }: { ids: string[] }) => {
    const res = await API.delete(`${routerLinks(name, 'api')}?${ids.map((id) => `ids=${id}`).join('&')}`);
    if (res.message) customMessage.success({ type: 'success', content: res.message });
    return res;
  }),
};

export const laiXeSlice = createSlice(
  new Slice<LaiXeModel, EStatusLaiXe>(action, {}, (builder) => {
    builder
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusLaiXe.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusLaiXe.deleteManyFulfilled;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusLaiXe.deleteManyRejected;
      })

  }),
);

export const LaiXeFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateLaiXe<LaiXeModel>),
    set: (values: StateLaiXe<LaiXeModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: any; keyState?: keyof StateLaiXe<LaiXeModel> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: LaiXeModel) => dispatch(action.post({ values })),
    put: (values: LaiXeModel) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    deleteMany: (ids: string[]) => dispatch(action.deleteMany({ ids })),
  };
};
interface StateLaiXe<T> extends State<T, EStatusLaiXe> {
  isEdit?: boolean;
  isViewDetails?: boolean
  selectedRowKeys?: string[]
}
export class LaiXeModel extends CommonEntity {
  constructor(
    public id: string,
    public idPhuongTien?: string,
    public ngaySinh?: string,
    public tenTaiXe?: string,
    public maTaiXe?: string,
    public cccd?: string,
    public gplx?: string,
    public phuongTien?: string,
    public active?: boolean,
  ) {
    super();
  }
}

export type T_LaiXeForm = {
  id: string
  idPhuongTien?: string
  ngaySinh?: string
  tenTaiXe?: string
  maTaiXe?: string
  cccd?: string
  gplx?: string
  phuongTien?: string
}
export enum EStatusLaiXe {
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
}
