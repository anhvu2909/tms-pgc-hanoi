import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { useAppDispatch, useTypedSelector, Action, Slice, State } from '@store';
import { CommonEntity, QueryParams } from '@models';
import { API, routerLinks } from '@utils';
import { customMessage } from 'src';

const name = 'ProductConfiguration';
const action = {
  ...new Action<ProductConfigurationModel, EStatusProductConfiguration>(name),
  deleteMany: createAsyncThunk(name + 'deleteMany', async ({ idList }: { idList: string[] }) => {
    const searchParams = new URLSearchParams();
    idList.forEach((x) => searchParams.append('idList', x));

    const res = await API.delete(`${routerLinks(name, 'api')}?${searchParams}`);
    if (res.message) customMessage.success({ type: 'success', content: res.message });

    return res;
  }),
};
export const productConfigurationSlice = createSlice(
  new Slice<ProductConfigurationModel, EStatusProductConfiguration>(action, {}, (builder) => {
    builder
      .addCase(action.deleteMany.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusProductConfiguration.deleteManyPending;
      })
      .addCase(action.deleteMany.fulfilled, (state) => {
        state.isLoading = false;
        state.status = EStatusProductConfiguration.deleteManyFulfilled;
      })
      .addCase(action.deleteMany.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusProductConfiguration.deleteManyRejected;
      });
  }),
);
export const ProductConfigurationFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StatusProductConfiguration<ProductConfigurationModel>),
    set: (values: StatusProductConfiguration<ProductConfigurationModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    post: (values: ProductConfigurationModel) => dispatch(action.post({ values })),
    put: (values: ProductConfigurationModel) => dispatch(action.put({ values })),
    delete: (id: string) => dispatch(action.delete({ id })),
    deleteMany: (idList: string[]) => dispatch(action.deleteMany({ idList })),
  };
};
interface StatusProductConfiguration<T> extends State<T, EStatusProductConfiguration> {
  isEdit?: boolean;
  selectedRowKeys?: string[];
}
export class ProductConfigurationModel extends CommonEntity {
  constructor(
    public id: string,
    public code: string,
    public productId: string,
    public productName: string,
    public gasTankId: string,
    public gasTankName: string,
    public residualGasId: string,
    public residualGasName: string,
    public note: string,
  ) {
    super();
  }
}
export enum EStatusProductConfiguration {
  deleteManyPending = 'deleteManyPending',
  deleteManyFulfilled = 'deleteManyFulfilled',
  deleteManyRejected = 'deleteManyRejected',
}
