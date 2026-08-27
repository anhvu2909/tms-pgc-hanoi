import { createSlice } from '@reduxjs/toolkit';
import { useAppDispatch, useTypedSelector, Action, Slice, State, User, TypesCodeTypeManagement } from '@store';
import { CommonEntity, QueryParams } from '@models';

const name = 'CodeTypeManagement';
const action = new Action<CodeTypeManagement>(name);
export const codeTypeManagementSlice = createSlice(new Slice<CodeTypeManagement>(action));
export const CodeTypeManagementFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as State<CodeTypeManagement>),
    set: (values: State<CodeTypeManagement>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof State<CodeTypeManagement> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: CodeTypeManagement) => dispatch(action.post({ values })),
    put: (values: CodeTypeManagement) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
  };
};
export class CodeTypeManagement extends CommonEntity {
  constructor(
    public code?: string,
    public type?: string,
    public title?: string,
    public description?: string,
    public createdAt?: string,
    public updatedAt?: string,
    public item?: TypesCodeTypeManagement,
    public users?: User[],
  ) {
    super();
  }
}
