import { createSlice } from '@reduxjs/toolkit';
import { useAppDispatch, useTypedSelector, Action, Slice, State, CodeTypeManagement } from '@store';
import { CommonEntity, QueryParams } from '@models';

const name = 'TypesCodeTypeManagement';
const action = new Action<TypesCodeTypeManagement>(name);
export const typesCodeTypeManagementSlice = createSlice(
  new Slice<TypesCodeTypeManagement>(action, { keepUnusedDataFor: 9999 }),
);
export const TypesCodeTypeManagementFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...(useTypedSelector((state) => state[action.name]) as State<TypesCodeTypeManagement>),
    set: (values: State<TypesCodeTypeManagement>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof State<TypesCodeTypeManagement> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: TypesCodeTypeManagement) => dispatch(action.post({ values })),
    put: (values: TypesCodeTypeManagement) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
  };
};
export class TypesCodeTypeManagement extends CommonEntity {
  constructor(
    public name: string = '',
    public code: string = '',
    public title: string = '',
    public isPrimary: boolean = false,
    public createdAt?: string,
    public updatedAt?: string,
    public items?: CodeTypeManagement[],
  ) {
    super();
  }
}