import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { useAppDispatch, useTypedSelector, Action, Slice, State } from '@store';
import { CommonEntity, QueryParams } from '@models';
import { API, productTypes, routerLinks } from '@utils';
import { customMessage } from 'src';

const name = 'SanPham';
const action = {
  ...new Action<SanPhamModel, EStatusSanPham>(name),
  deleteMany: createAsyncThunk(name + 'deleteMany', async ({ ids }: { ids: string[] }) => {
    const res = await API.delete(`${routerLinks(name, 'api')}?${ids.map((id) => `ids=${id}`).join('&')}`);
    if (res.message) customMessage.success({ type: 'success', content: res.message });
    return res;
  }),
};
export const sanPhamSlice = createSlice(
  new Slice<SanPhamModel, EStatusSanPham>(action, {}, (builder) => {
    builder
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusSanPham.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusSanPham.deleteManyFulfilled;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusSanPham.deleteManyRejected;
      });
  }),
);
export const SanPhamFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateSanPham<SanPhamModel>),
    set: (values: StateSanPham<SanPhamModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: any; keyState?: keyof StateSanPham<SanPhamModel> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: SanPhamModel) => dispatch(action.post({ values })),
    put: (values: SanPhamModel) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    deleteMany: (ids: string[]) => dispatch(action.deleteMany({ ids })),
  };
};
interface StateSanPham<T> extends State<T, EStatusSanPham> {
  isEdit?: boolean;
  listSanPham?: T[];
  selectedRowKeys?: string[];
}

type ProductType = typeof productTypes;
export class SanPhamModel extends CommonEntity {
  constructor(
    public id?: string,
    public maSanPham?: string,
    public tenSanPham?: string,
    public donViTinh?: string,
    public donGia?: number,
    public trongLuong?: number,
    public isOrder?: boolean,
    public type?: ProductType[keyof ProductType]['code'],
  ) {
    super();
  }
}
export enum EStatusSanPham {
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
}
