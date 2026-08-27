import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { useAppDispatch, useTypedSelector, Action, Slice, State } from '@store';
import { CommonEntity, QueryParams } from '@models';
import { API, routerLinks } from '@utils';
import { customMessage } from '../../index';

const name = 'Xe';
const action = {
  ...new Action<PhuongTienModel, EStatusPhuongTien>(name),
  deleteMany: createAsyncThunk(name + 'deleteMany', async ({ ids }: { ids: string[] }) => {
    const res = await API.delete(`${routerLinks(name, 'api')}?${ids.map((id) => `ids=${id}`).join('&')}`);
    if (res.message) customMessage.success({ type: 'success', content: res.message });
    return res;
  }),
};

export const phuongTienSlice = createSlice(
  new Slice<PhuongTienModel, EStatusPhuongTien>(action, {}, (builder) => {
    builder
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusPhuongTien.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusPhuongTien.deleteManyFulfilled;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusPhuongTien.deleteManyRejected;
      })

  }),
);
export const PhuongTienFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StatePhuongTien<PhuongTienModel>),
    set: (values: StatePhuongTien<PhuongTienModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: any; keyState?: keyof StatePhuongTien<PhuongTienModel> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: PhuongTienModel) => dispatch(action.post({ values })),
    put: (values: PhuongTienModel) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    deleteMany: (ids: string[]) => dispatch(action.deleteMany({ ids })),
  };
};
interface StatePhuongTien<T> extends State<T,EStatusPhuongTien> {
  isEdit?: boolean;
  isViewDetails?: boolean
  selectedRowKeys?: string[];
}
export class PhuongTienModel extends CommonEntity {
  constructor(
    public id?: string,
    public bienSoXe?: string,
    public soKhung?: string,
    public soMay?: string,
    public hangSanXuat?: string,
    public model?: string,
    public namSanXuat?: string,
    public taiTrong?: string,
    public idTaiXe?: string,
    public taiXe?: string,
    public congTy?: string,
    public active?: boolean,
  ) {
    super();
  }
}
export enum EStatusPhuongTien {
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
}
