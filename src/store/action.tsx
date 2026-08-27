import { CommonEntity, EStatusState, Pagination, QueryParams, Responses } from '@models';
import { AsyncThunk, createAsyncThunk } from '@reduxjs/toolkit';
import { State } from '@store';
import { API, routerLinks } from '@utils';
import { customMessage } from '../index';

export class Action<T extends CommonEntity, S = EStatusState> {
  public name: string;
  public set: AsyncThunk<State<T, S>, State<T, S>, object>;
  public get: AsyncThunk<Responses<Pagination<T>>, QueryParams, object>;
  public getById: AsyncThunk<
    { res: Responses<T>; keyState: keyof State<T, S> },
    { id: string; type?: string; keyState: keyof State<T, S> },
    object
  >;
  public post: AsyncThunk<Responses<T>, { values: T }, object>;
  public put: AsyncThunk<Responses<T>, { values: T }, object>;
  public putDisable: AsyncThunk<Responses<T>, { id: string; disable: boolean }, object>;
  public delete: AsyncThunk<Responses<T>, { id: string }, object>;

  constructor(name: string) {
    this.name = name;

    this.set = createAsyncThunk(name + '/set', async (values: State<T, S>) => values);

    this.get = createAsyncThunk(
      name + '/get',
      async (params: QueryParams) => await API.get<Pagination<T>>(`${routerLinks(name, 'api')}`, params),
    );

    this.getById = createAsyncThunk(
      name + '/getById',
      async ({ id, keyState = 'isVisible' }: { id: string; keyState: keyof State<T, S> }) => {
        const res = await API.get<T>(`${routerLinks(name, 'api')}/${id}`);
        return { res, keyState };
      },
    );

    this.post = createAsyncThunk(name + '/post', async ({ values }) => {
      const res = await API.post<T>(`${routerLinks(name, 'api')}`, values);
      if (res.message) customMessage.success({ type: 'success', content: res.message });
      return res;
    });

    this.put = createAsyncThunk(name + '/put', async ({ values }) => {
      const res = await API.put<T>(`${routerLinks(name, 'api')}/${values.id}`, values);
      if (res.message) customMessage.success({ type: 'success', content: res.message });
      return res;
    });

    this.putDisable = createAsyncThunk(name + '/putDisable', async ({ id, disable }) => {
      const res = await API.put<T>(`${routerLinks(name, 'api')}/${id}/disable/${disable}`, {});
      if (res.message) customMessage.success({ type: 'success', content: res.message });
      return res;
    });

    this.delete = createAsyncThunk(name + '/delete', async ({ id }) => {
      const res = await API.delete<T>(`${routerLinks(name, 'api')}/${id}`);
      if (res.message) customMessage.success({ type: 'success', content: res.message });
      return res;
    });
  }
}
