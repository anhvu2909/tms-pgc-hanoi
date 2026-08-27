import { EStatusState, QueryParams, Responses } from '@models';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { Action, Slice, State, useAppDispatch, useTypedSelector } from '@store';
import { API } from '@utils';

const name = 'Role';
const action = {
  ...new Action<Role>(name),
  getPermission: createAsyncThunk(name + '/permission', async () => API.get<Responses<string[]>>(`idm/roles`)),
};
export const roleSlice = createSlice(new Slice<Role>(action, { keepUnusedDataFor: 9999 }));
export const RoleFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateRole<Role>),
    set: (values: StateRole<Role>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateRole<Role> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: Role) => dispatch(action.post({ values })),
    put: (values: Role) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
    getPermission: () => dispatch(action.getPermission()),
  };
};

interface StateRole<T> extends State<T> {
  isEdit?: boolean;
}

export class Role {
  constructor(
    public description?: string,
    public id?: string,
    public code?: string,
    public name?: string,
    public isSystem?: boolean,
    public level?: number,
    public value?: string,
    public label?: string,
  ) {}
}
