import { CommonEntity, EStatusState, Pagination, QueryParams } from '@models';
import { createAsyncThunk, createSlice, Draft } from '@reduxjs/toolkit';
import { Action, SanPhamModel, Slice, State, useAppDispatch, useTypedSelector } from '@store';
import { API, routerLinks } from '@utils';
import React from 'react';

const name = 'WarehouseTransaction';

const action = {
  ...new Action<WarehouseTransactionModel, EStatusWarehouseTransaction>(name),
  getWarehouseTransaction: createAsyncThunk(
    name,
    async (params: QueryParams) =>
      await API.get<Pagination<WarehouseTransactionDataType>>(`${routerLinks(name, 'api')}`, params),
  ),
  getProductConfiguration: createAsyncThunk(
    'ProductConfiguration',
    async (params: QueryParams) =>
      await API.get<Pagination<ProductConfiguration>>(`${routerLinks('ProductConfiguration', 'api')}`, params),
  ),
};

export const warehouseTransactionSlice = createSlice(
  new Slice<WarehouseTransactionModel, EStatusWarehouseTransaction>(action, {}, (builder) => {
    builder
      .addCase(action.getWarehouseTransaction.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusWarehouseTransaction.getWarehouseTransactionPending;
      })
      .addCase(
        action.getWarehouseTransaction.fulfilled,
        (state: StateWarehouseTransaction<WarehouseTransactionModel>, action) => {
          const { ...res } = action.payload;
          if (res.data) {
            state.dataWarehouseTransactionList = res.data;
          }
          state.isLoading = false;

          if (res.isSuccess) state.status = EStatusWarehouseTransaction.getWarehouseTransactionFulfilled;
          else state.status = EStatusState.idle;
        },
      )
      .addCase(action.getWarehouseTransaction.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusWarehouseTransaction.getWarehouseTransactionRejected;
      })

      //product-configuration
      .addCase(action.getProductConfiguration.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusWarehouseTransaction.getProductConfigurationPending;
      })
      .addCase(
        action.getProductConfiguration.fulfilled,
        (state: StateWarehouseTransaction<WarehouseTransactionModel>, action) => {
          const { ...res } = action.payload;
          if (res.data) {
            state.dataProductConfigurationList = res.data.content;
          }
          state.isLoading = false;

          if (res.isSuccess) state.status = EStatusWarehouseTransaction.getProductConfigurationFulfilled;
          else state.status = EStatusState.idle;
        },
      )
      .addCase(action.getProductConfiguration.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusWarehouseTransaction.getProductConfigurationRejected;
      });
  }),
);
export const WarehouseTransactionFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateWarehouseTransaction<WarehouseTransactionModel>),
    set: (values: StateWarehouseTransaction<WarehouseTransactionModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({
      id,
      keyState = 'isVisible',
    }: {
      id: any;
      keyState?: keyof StateWarehouseTransaction<WarehouseTransactionModel>;
    }) => dispatch(action.getById({ id, keyState })),
    post: (values: WarehouseTransactionModel) => dispatch(action.post({ values })),
    getWarehouseTransaction: (params: QueryParams) => dispatch(action.getWarehouseTransaction(params)),
    getProductConfiguration: (params: QueryParams) => dispatch(action.getProductConfiguration(params)),
  };
};
interface Product extends SanPhamModel {
  quantity: number;
}
interface StateWarehouseTransaction<T> extends State<T, EStatusWarehouseTransaction> {
  isDisable?: boolean;
  warehouseType?: string;
  showModalAddMany?: boolean;
  dataManySource?: Product[];
  dataSource?: Product[];

  dataWarehouseTransactionList?: Pagination<WarehouseTransactionDataType>;
  dataProductConfigurationList?: ProductConfiguration[];

  deliveryDateRange?: [string, string];
  warehouseSelect?: string;
  productName?: string;
  productOnly?: (string | undefined)[] ;
}

export class WarehouseTransactionModel extends CommonEntity {
  constructor(
    public warehouseId: string | undefined,
    public productsData: Product[],
  ) {
    super();
  }
}

interface QuantityAndWeight {
  quantity: number;
  totalWeight: number;
}

interface WarehouseTransactionDataType {
  key: number,
  id: string;
  productName: string;
  unit: string;
  startBalance: QuantityAndWeight;
  importBalance: QuantityAndWeight;
  exportBalance: QuantityAndWeight;
  endBalance: QuantityAndWeight;
}

interface ProductConfiguration {
  id: string;
  code: string;
  productId: string;
  productName: string;
  gasTankId: string;
  gasTankName: string;
  residualGasId: string;
  residualGasName: string;
  note: string | null;
  createdByUserId: string;
  lastModifiedByUserId: string;
  lastModifiedOnDate: string;
  createdOnDate: string;
  createdByUserName: string;
  lastModifiedByUserName: string;
}

export enum EStatusWarehouseTransaction {
  getWarehouseTransactionPending = 'getWarehouseTransactionPending',
  getWarehouseTransactionFulfilled = 'getWarehouseTransactionFulfilled',
  getWarehouseTransactionRejected = 'getWarehouseTransactionRejected',
  getProductConfigurationPending = 'getProductConfigurationPending',
  getProductConfigurationFulfilled = 'getProductConfigurationFulfilled',
  getProductConfigurationRejected = 'getProductConfigurationRejected',
}
