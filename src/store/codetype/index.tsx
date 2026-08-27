import { createSlice } from '@reduxjs/toolkit';

import { useAppDispatch, useTypedSelector, Action, Slice, State } from '@store';
import { CommonEntity, QueryParams } from '@models';

const name = 'CodeType';
const action = new Action<CodeTypeModel>(name);
export const codeTypeSlice = createSlice(new Slice<CodeTypeModel>(action));
export const CodeTypeFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateCodeType<CodeTypeModel>),
    get: (params: QueryParams) => dispatch(action.get(params)),
  };
};
interface StateCodeType<T> extends State<T> {
  isEdit?: boolean;
}
export class CodeTypeModel extends CommonEntity {
  constructor(
    public id: string,
    public title?: string,
    public code?: string,
    public translations?: string,
  ) {
    super();
  }
}
