import { CommonEntity, QueryParams } from '@models';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Action, KhoModel, Slice, State, useAppDispatch, useTypedSelector } from '@store';
import { LichSuChamSocModel } from '../lich-su-cham-soc';
import { API, routerLinks } from '@utils';
import { customMessage } from 'src';

const name = 'KhachHang';

const action = {
  ...new Action<KhachHangModel, EStatusKhachHang>(name),
  deleteMany: createAsyncThunk(name + 'deleteMany', async ({ ids }: { ids: string[] }) => {
    const res = await API.delete(`${routerLinks(name, 'api')}?${ids.map((id) => `ids=${id}`).join('&')}`);
    if (res.message) customMessage.success({ type: 'success', content: res.message });
    return res;
  }),
};
export const khachHangSlice = createSlice(
  new Slice<KhachHangModel, EStatusKhachHang>(action, {}, (builder) => {
    builder
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusKhachHang.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusKhachHang.deleteManyFulfilled;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusKhachHang.deleteManyRejected;
      });
  }),
);
export const KhachHangFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateKhachHang<KhachHangModel>),
    set: (values: StateKhachHang<KhachHangModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: any; keyState?: keyof StateKhachHang<KhachHangModel> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: KhachHangModel) => dispatch(action.post({ values })),
    put: (values: KhachHangModel) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    deleteMany: (ids: string[]) => dispatch(action.deleteMany({ ids })),
  };
};
interface StateKhachHang<T> extends State<T, EStatusKhachHang> {
  isEdit?: boolean;
  isDetail?: boolean;
  selectedRowKeys?: string[];
}

export class KhachHangModel extends CommonEntity {
  constructor(
    public id: string,
    public ma: string,
    public ten: string,
    public ghiChu: string,
    public soDienThoai: string,
    public diaChi: string,
    public birthdate: string,
    public loaiKhachHang: string,
    public lastCareOnDate: string,
    public nguoiPhuTrach: string,
    public listKho: KhoModel[],
  ) {
    super();
  }
}

export type T_KhachHangFilterFields = {
  fullTextSearch?: string;
  loaiKhachHang?: string;
  trangThai?: string;
};

export type T_KhachHangFilter = {
  page?: number;
  size?: number;
  sort?: string;
  order?: string;
  filter: T_KhachHangFilterFields;
};

export enum EStatusKhachHang {
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
}
