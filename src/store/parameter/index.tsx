import { createAsyncThunk, createSlice, Draft } from '@reduxjs/toolkit';
import { Action, Slice, State, useAppDispatch, useTypedSelector } from '@store';
import { CommonEntity, EStatusState, QueryParams } from '@models';
import { API, routerLinks } from '@utils';

const name = 'Parameter';
const action = {
  ...new Action<Parameter, EStatusParameter>(name),
  getAll: createAsyncThunk(name + 'getAll', async () => {
    return await API.get<Parameter>(`${routerLinks(name, 'api')}/all`);
  }),
  getByName: createAsyncThunk(name, async (nameParmeter: string) => {
    return await API.get<Parameter>(`${routerLinks(name, 'api')}/${nameParmeter}`);
  }),
};
export const parameterSlice = createSlice(
  new Slice<Parameter, EStatusParameter>(action, { keepUnusedDataFor: 9999 }, (builder) => {
    builder
      .addCase(action.getAll.pending, (state, action) => {
        state.time = new Date().getTime() + (state.keepUnusedDataFor || 60) * 1000;
        state.queryParams = JSON.stringify(action.meta.arg);
        state.isLoading = true;
        state.status = EStatusParameter.getAllPending;
      })
      .addCase(action.getAll.fulfilled, (state, action) => {
        if (action.payload) {
          state.tree = action.payload.data;
          state.status = EStatusParameter.getAllFulfilled;
        } else state.status = EStatusState.idle;
        state.isLoading = false;
      })
      .addCase(action.getAll.rejected, (state: StateParameter<Parameter>) => {
        state.status = EStatusParameter.getAllRejected;
        state.isLoading = false;
      })

      .addCase(action.getByName.pending, (state, action) => {
        state.time = new Date().getTime() + (state.keepUnusedDataFor || 60) * 1000;
        state.queryParams = JSON.stringify(action.meta.arg);
        state.isLoading = true;
        state.status = EStatusParameter.getByNamePending;
      })
      .addCase(action.getByName.fulfilled, (state, action) => {
        if (action.payload) {
          state.data = action.payload as Draft<Parameter>;
          state.status = EStatusParameter.getByNameFulfilled;
        }
      })
      .addCase(action.getByName.rejected, (state: StateParameter<Parameter>) => {
        state.status = EStatusParameter.getByNameRejected;
        state.isLoading = false;
      });
  }),
);

export const ParameterFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateParameter<Parameter>),
    set: (values: StateParameter<Parameter>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateParameter<Parameter> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: Parameter) => dispatch(action.post({ values })),
    put: (values: Parameter) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    getAll: () => dispatch(action.getAll()),
    getByName: (parameterName: string) => dispatch(action.getByName(parameterName)),
  };
};
interface StateParameter<T> extends State<T, EStatusParameter> {
  tree?: T[];
}
export class Parameter extends CommonEntity {
  constructor(
    public id: string,
    public name: string,
    public value: string,
    public description: string,
    public groupCode: string,
    public isSystem: boolean,
    public isPrimary: boolean,
    public createOnDate: string,
    public lastModifiedOnDate: string,
    public title: string,
    public key: string,
    public expanded: boolean,
    public isLeaf: boolean,
  ) {
    super();
  }
}
export enum EStatusParameter {
  idle = 'idle',
  getAllPending = 'getAllPending',
  getAllFulfilled = 'getAllFulfilled',
  getAllRejected = 'getAllRejected',
  getByNamePending = 'getByNamePending',
  getByNameFulfilled = 'getByNameFulfilled',
  getByNameRejected = 'getByNameRejected',
}
