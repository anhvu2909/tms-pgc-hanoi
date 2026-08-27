import { ActionReducerMapBuilder, Draft, ReducersMapObject } from '@reduxjs/toolkit';
import { CommonEntity, EStatusState, Pagination } from '@models';
import { Action } from '@store';

export interface State<T = object, S = EStatusState> {
  [selector: string]: any;
  pagination?: Pagination<T>;
  data?: T;
  allowActions?: string[];
  id?: string;
  isLoading?: boolean;
  isFormLoading?: boolean;
  isVisible?: boolean ;
  status?: EStatusState | S;
  queryParams?: string;
  query?: { [key: string]: any };
  keepUnusedDataFor?: number;
  time?: number;
  reRender?: boolean;
}

export class Slice<T extends CommonEntity, S = EStatusState> {
  name: string;
  initialState: State<T, S>;
  reducers: ReducersMapObject;
  extraReducers: (builder: ActionReducerMapBuilder<State<T, S>>) => void;
  defaultState: State<T, S> = {
    status: EStatusState.idle,
    queryParams: '',
    keepUnusedDataFor: 60,
    time: 0,
    reRender: false,
    isFormLoading: false,
  };
  constructor(
    action: Action<T, S>,
    initialState: State<T, S> = {},
    extraReducers?: (builder: ActionReducerMapBuilder<State<T, S>>) => void,
  ) {
    this.name = action.name;
    this.initialState = { ...this.defaultState, ...initialState };
    this.reducers = {};
    this.extraReducers = (builder) => {
      this.set(action, builder);
      this.get(action, builder);
      this.getById(action, builder);
      this.post(action, builder);
      this.put(action, builder);
      this.delete(action, builder);
      this.putDisable(action, builder);
      extraReducers && extraReducers(builder);
    };
  }

  set(action: Action<T, S>, builder: ActionReducerMapBuilder<State<T, S>>) {
    builder.addCase(action.set.fulfilled, (state, action) => {
      Object.keys(action.payload).forEach((key) => {
        state[key] = action.payload[key as keyof State<T, S>];
      });
      state.status = EStatusState.idle;
    });
  }

  get(action: Action<T, S>, builder: ActionReducerMapBuilder<State<T, S>>) {
    builder
      .addCase(action.get.pending, (state, action) => {
        if (!state.isLoading) {
          state.isLoading = true;
          state.status = EStatusState.getPending;
        }
        this.defaultState.time = new Date().getTime() + (state.keepUnusedDataFor || 60) * 1000;
        this.defaultState.queryParams = JSON.stringify(action.meta.arg);
      })
      .addCase(action.get.fulfilled, (state, action) => {
        const { ...res } = action.payload;
        if (res.data) {
          state.pagination = res.data as Draft<Pagination<T>>;
        }
        state.time = this.defaultState.time;
        state.queryParams = this.defaultState.queryParams;
        state.isLoading = false;

        if (res.isSuccess) state.status = EStatusState.getFulfilled;
        else state.status = EStatusState.idle;
      })
      .addCase(action.get.rejected, (state) => {
        state.status = EStatusState.getRejected;
        state.time = this.defaultState.time;
        state.queryParams = this.defaultState.queryParams;
        state.isLoading = false;
      });
  }

  getById(action: Action<T, S>, builder: ActionReducerMapBuilder<State<T, S>>) {
    builder
      .addCase(action.getById.pending, (state, action) => {
        const { keyState, id } = action.meta.arg;
        state[keyState] = true;
        state.id = id;
        state.isFormLoading = true;
        state.status = EStatusState.getByIdPending;
      })
      .addCase(action.getById.fulfilled, (state, action) => {
        const { res } = action.payload;
        if (res.data && JSON.stringify(state.data) !== JSON.stringify(res.data)) {
          (state as any).data = res.data; // ép kiểu qua any: lỗi type false-positive do version immer mới, không đổi hành vi runtime
        }
        state.isFormLoading = false;

        if (res.isSuccess) state.status = EStatusState.getByIdFulfilled;
        else state.status = EStatusState.idle;
      })
      .addCase(action.getById.rejected, (state) => {
        state.isFormLoading = false;
        state.status = EStatusState.getByIdRejected;
      });
  }

  post(action: Action<T, S>, builder: ActionReducerMapBuilder<State<T, S>>) {
    builder
      .addCase(action.post.pending, (state, action) => {
        state.isFormLoading = true;
        (state as any).data = action.meta.arg.values; // ép kiểu qua any: lỗi type false-positive do version immer mới, không đổi hành vi runtime
        state.status = EStatusState.postPending;
      })
      .addCase(action.post.fulfilled, (state, action) => {
        const { ...res } = action.payload;
        if (res.data && JSON.stringify(state.data) !== JSON.stringify(res.data)) {
          (state as any).data = res.data; // ép kiểu qua any: lỗi type false-positive do version immer mới, không đổi hành vi runtime
        }
        state.isVisible = false;
        state.isFormLoading = false;

        if (res.isSuccess) state.status = EStatusState.postFulfilled;
        else state.status = EStatusState.idle;
      })
      .addCase(action.post.rejected, (state) => {
        state.isFormLoading = false;
        state.status = EStatusState.postRejected;
      });
  }

  put(action: Action<T, S>, builder: ActionReducerMapBuilder<State<T, S>>) {
    builder
      .addCase(action.put.pending, (state, action) => {
        state.isFormLoading = true;
        (state as any).data = action.meta.arg.values; // ép kiểu qua any: lỗi type false-positive do version immer mới, không đổi hành vi runtime
        state.status = EStatusState.putPending;
      })
      .addCase(action.put.fulfilled, (state, action) => {
        const { ...res } = action.payload;
        if (res.data && JSON.stringify(state.data) !== JSON.stringify(res.data)) {
          (state as any).data = res.data; // ép kiểu qua any: lỗi type false-positive do version immer mới, không đổi hành vi runtime
        }
        state.isVisible = false;
        state.isFormLoading = false;

        if (res.isSuccess) state.status = EStatusState.putFulfilled;
        else state.status = EStatusState.idle;
      })
      .addCase(action.put.rejected, (state) => {
        state.isFormLoading = false;
        state.status = EStatusState.putRejected;
      });
  }

  delete(action: Action<T, S>, builder: ActionReducerMapBuilder<State<T, S>>) {
    builder
      .addCase(action.delete.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusState.deletePending;
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .addCase(action.delete.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = EStatusState.deleteFulfilled;
      })
      .addCase(action.delete.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusState.deleteRejected;
      });
  }

  putDisable(action: Action<T, S>, builder: ActionReducerMapBuilder<State<T, S>>) {
    builder
      .addCase(action.putDisable.pending, (state) => {
        state.isLoading = true;
        state.status = EStatusState.putDisablePending;
      })
      .addCase(action.putDisable.fulfilled, (state, action) => {
        state.isVisible = false;
        state.isLoading = false;
        state.status = action.payload ? EStatusState.putDisableFulfilled : EStatusState.idle;
      })
      .addCase(action.putDisable.rejected, (state) => {
        state.isLoading = false;
        state.status = EStatusState.putDisableRejected;
      });
  }
}
