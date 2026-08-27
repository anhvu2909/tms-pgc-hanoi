import { createAsyncThunk, createSlice, Draft, PayloadAction } from '@reduxjs/toolkit';
import { useAppDispatch, useTypedSelector, Action, Slice, State, Parameter } from '@store';
import { CommonEntity, EStatusState, QueryParams } from '@models';
import { API, routerLinks } from '@utils';

const name = 'Address';
const action = {
  ...new Action<Address, EStatusAddress>(name),
  getTinh: createAsyncThunk(
    name + '/getFilterTinh',
    async ({ filter }: { filter: string }) => await API.get('/tinh', { filter }),
  ),
  getHuyen: createAsyncThunk(
    name + '/getHuyen',
    async ({ filter }: { filter: string }) => await API.get('/huyen', { filter }),
  ),
  getXa: createAsyncThunk(
    name + '/getXa',
    async ({ filter }: { filter: string }) => await API.get('/phuong', { filter }),
  ),
};
export const addressSlice = createSlice(
  new Slice<Address, EStatusAddress>(action, { list: [] }, (builder) => {
    builder
      .addCase(action.getTinh.pending, (state, action) => {
        state.time = new Date().getTime() + (state.keepUnusedDataFor || 60) * 1000;
        state.queryParams = JSON.stringify(action.meta.arg);
        state.isLoading = true;
        state.status = EStatusAddress.getTinhPending;
      })
      .addCase(action.getTinh.fulfilled, (state, action) => {
        if (action.payload) {
          state.listTinh = (action.payload.data as Draft<Address[]>).map((item: any) => ({
            value: item.provinceCode,
            label: item.provinceName,
          }));
          state.status = EStatusAddress.getTinhFulfilled;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.getTinh.rejected, (state) => {
        state.status = EStatusAddress.getTinhRejected;
        state.isLoading = false;
      })
      .addCase(action.getHuyen.pending, (state, action) => {
        state.time = new Date().getTime() + (state.keepUnusedDataFor || 60) * 1000;
        state.queryParams = JSON.stringify(action.meta.arg);
        state.isLoading = true;
        state.status = EStatusAddress.getHuyenPending;
      })
      .addCase(action.getHuyen.fulfilled, (state, action) => {
        if (action.payload) {
          state.listHuyen = (action.payload.data as Draft<Address[]>).map((item: any) => ({
            value: item.districtCode,
            label: item.districtName,
          }));
          state.status = EStatusAddress.getHuyenFulfilled;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.getHuyen.rejected, (state) => {
        state.status = EStatusAddress.getHuyenRejected;
        state.isLoading = false;
      })
      .addCase(action.getXa.pending, (state, action) => {
        state.time = new Date().getTime() + (state.keepUnusedDataFor || 60) * 1000;
        state.queryParams = JSON.stringify(action.meta.arg);
        state.isLoading = true;
        state.status = EStatusAddress.getXaPending;
      })
      .addCase(action.getXa.fulfilled, (state, action) => {
        if (action.payload) {
          state.listXa = (action.payload.data as Draft<Address[]>).map((item: any) => ({
            value: item.communeCode,
            label: item.communeName,
          }));
          state.status = EStatusAddress.getXaFulfilled;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.getXa.rejected, (state) => {
        state.status = EStatusAddress.getXaRejected;
        state.isLoading = false;
      });
  }),
);
export const AddressFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...(useTypedSelector((state) => state[action.name]) as StateAddress<Address>),
    set: (values: StateAddress<Address>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateAddress<Address> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: Address) => dispatch(action.post({ values })),
    put: (values: Address) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    getTinh: (params: { filter: string }) => dispatch(action.getTinh(params)),
    getHuyen: (params: { filter: string }) => dispatch(action.getHuyen(params)),
    getXa: (params: { filter: string }) => dispatch(action.getXa(params)),
  };
};
interface StateAddress<T> extends State<T, EStatusAddress> {
  list?: T[];
  isTinhLoading?: boolean;
  listTinh?: [];
  isHuyenLoading?: boolean;
  listHuyen?: [];
  isXaLoading?: boolean;
  listXa?: [];
  valueHuyen?: number;
  valueXa?: number;
  tenTinh?: string;
}
export class Address extends CommonEntity {
  constructor(
    public id?: string,
    public provinceCode?: number,
    public provinceName?: string,
    public districtCode?: number,
    public districtName?: string,
    public communeCode?: number,
    public communeName?: string,
  ) {
    super();
  }
}
export enum EStatusAddress {
  getTinhPending = 'getTinhPending',
  getTinhFulfilled = 'getTinhFulfilled',
  getTinhRejected = 'getTinhRejected',
  getHuyenPending = 'getHuyenPending',
  getHuyenFulfilled = 'getHuyenFulfilled',
  getHuyenRejected = 'getHuyenRejected',
  getXaPending = 'getXaPending',
  getXaFulfilled = 'getXaFulfilled',
  getXaRejected = 'getXaRejected',
}
