import { CommonEntity, EStatusState, Pagination, QueryParams } from '@models';
import { createAsyncThunk, createSlice, Draft } from '@reduxjs/toolkit';
import { Action, KhachHangModel, Slice, State, useAppDispatch, User, useTypedSelector } from '@store';
import { LichSuChamSocModel } from '../lich-su-cham-soc';
import { API, routerLinks } from '@utils';
import { customMessage } from 'src';

const name = 'Kho';

const action = {
  ...new Action<KhoModel, EStatusKho>(name),
  deleteMany: createAsyncThunk(name + 'deleteMany', async ({ ids }: { ids: string[] }) => {
    const res = await API.delete(`${routerLinks(name, 'api')}?${ids.map((id) => `ids=${id}`).join('&')}`);
    if (res.message) customMessage.success({ type: 'success', content: res.message });
    return res;
  }),
  getAllKho: createAsyncThunk(
    name + '/getAllKho',
    async (params: QueryParams) => await API.get<Pagination<KhoModel>>(`${routerLinks(name, 'api')}`, params),
  ),
};
let query = '';
export const khoSlice = createSlice(
  new Slice<KhoModel, EStatusKho>(action, {}, (builder) => {
    builder
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusKho.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusKho.deleteManyFulfilled;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusKho.deleteManyRejected;
      })
      .addCase(action.getAllKho.pending, (state, action) => {
        if (!state.isLoading) {
          state.isLoading = true;
          state.status = EStatusKho.getAllKhoPending;
        }
        query = JSON.stringify(action.meta.arg);
      })
      .addCase(action.getAllKho.fulfilled, (state: StateKho<KhoModel>, action) => {
        const { ...res } = action.payload;
        if (res.data) {
          state.allKho = res.data as Draft<Pagination<KhoModel>>;
        }
        state.queryParams = query;
        state.isLoading = false;

        if (res.isSuccess) state.status = EStatusKho.getAllKhoFulfilled;
        else state.status = EStatusState.idle;
      })
      .addCase(action.getAllKho.rejected, (state) => {
        state.status = EStatusKho.getAllKhoRejected;
        state.queryParams = query;
        state.isLoading = false;
      });
  }),
);
export const KhoFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateKho<KhoModel>),
    set: (values: StateKho<KhoModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: any; keyState?: keyof StateKho<KhoModel> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: KhoModel) => dispatch(action.post({ values })),
    put: (values: KhoModel) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    deleteMany: (ids: string[]) => dispatch(action.deleteMany({ ids })),
    getAllKho: (params: QueryParams) => dispatch(action.getAllKho(params)),
  };
};
interface StateKho<T> extends State<T, EStatusKho> {
  isEdit?: boolean;
  isDetail?: boolean;
  selectedRowKeys?: string[];
  idKhachHang?: string;
  idCuaHang?: string;
  allKho?: any;
}

export class KhoModel extends CommonEntity {
  constructor(
    public id: string,
    public ma: string,
    public ten: string,
    public diaChi: string,
    public loaiKho: string,
    public ghiChu: string,
    public khachHang: KhachHangModel,
    public khachHangId: string,
    public createdByUser: User,
    public binh: number,
    public voBinh: number,
    public gasDu: number,
    public latitude: number,
    public longitude: number,
    public provinceCode?: number,
    public provinceName?: string,
    public districtCode?: number,
    public districtName?: string,
    public communeCode?: number,
    public communeName?: string,
    public diaChiFull?: string,
    public isCuaHang?: boolean,
    public isInitialized?: boolean,
  ) {
    super();
  }
}

export type T_KhoFilterFields = {
  fullTextSearch?: string;
  loaiKho?: string;
  trangThai?: string;
};

export type T_Khoilter = {
  page?: number;
  size?: number;
  sort?: string;
  order?: string;
  filter: T_KhoFilterFields;
};

export enum EStatusKho {
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
  getAllKhoPending = 'getAllKhoPending',
  getAllKhoFulfilled = 'getAllKhoFulfilled',
  getAllKhoRejected = 'getAllKhoRejected',
}
