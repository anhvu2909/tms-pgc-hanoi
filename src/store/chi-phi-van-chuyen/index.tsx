import { CommonEntity, QueryParams } from '@models';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Action, Slice, State, useAppDispatch, useTypedSelector } from '@store';
import { API, routerLinks } from '@utils';
import { customMessage } from 'src';

const name = 'ChiPhiVanChuyen';

const action = {
  ...new Action<ChiPhiVanChuyenModel, EStatusChiPhiVanChuyen>(name),
  deleteMany: createAsyncThunk(name + 'deleteMany', async ({ ids }: { ids: string[] }) => {
    const res = await API.delete(`${routerLinks(name, 'api')}?${ids.map((id) => `ids=${id}`).join('&')}`);
    if (res.message) customMessage.success({ type: 'success', content: res.message });
    return res;
  }),
};
export const chiPhiVanChuyenSlice = createSlice(
  new Slice<ChiPhiVanChuyenModel, EStatusChiPhiVanChuyen>(action, {}, (builder) => {
    builder
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusChiPhiVanChuyen.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusChiPhiVanChuyen.deleteManyFulfilled;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusChiPhiVanChuyen.deleteManyRejected;
      });
  }),
);
export const ChiPhiVanChuyenFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateChiPhiVanChuyen<ChiPhiVanChuyenModel>),
    set: (values: StateChiPhiVanChuyen<ChiPhiVanChuyenModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: any; keyState?: keyof StateChiPhiVanChuyen<ChiPhiVanChuyenModel> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: ChiPhiVanChuyenModel) => dispatch(action.post({ values })),
    put: (values: ChiPhiVanChuyenModel) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    deleteMany: (ids: string[]) => dispatch(action.deleteMany({ ids })),
  };
};
interface StateChiPhiVanChuyen<T> extends State<T, EStatusChiPhiVanChuyen> {
  isEdit?: boolean;
  isDetail?: boolean;
  selectedRowKeys?: string[];
  isChiPhiLoading?: boolean,
  cuocVanChuyen?: number,
}

export class ChiPhiVanChuyenModel extends CommonEntity {
  constructor(
    public id: string,
    public ma: string,
    public ten: string,
    public ghiChu: string,
    public chiPhi: number,
    public khoDi: string,
    public khoNhan: string,
    public khoDiId: string,
    public khoNhanId: number,
    public khoangCach: number,
  ) {
    super();
  }
}

export type T_ChiPhiVanChuyenFilterFields = {
  fullTextSearch?: string;
  loaiChiPhiVanChuyen?: string;
  trangThai?: string;
};

export type T_ChiPhiVanChuyenFilter = {
  page?: number;
  size?: number;
  sort?: string;
  order?: string;
  filter: T_ChiPhiVanChuyenFilterFields;
};

export enum EStatusChiPhiVanChuyen {
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
}
