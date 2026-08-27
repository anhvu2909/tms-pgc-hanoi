import { createSlice } from '@reduxjs/toolkit';

import { CommonEntity, QueryParams } from '@models';
import { Action, Slice, State, useAppDispatch, useTypedSelector } from '@store';

const name = 'PublicityLevel';
const action = new Action<PublicityLevelModel>(name);
export const publicityLevelSlice = createSlice(new Slice<PublicityLevelModel>(action));
export const PublicityLevelFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StatePublicityLevel<PublicityLevelModel>),
    set: (values: StatePublicityLevel<PublicityLevelModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: any; keyState?: keyof StatePublicityLevel<PublicityLevelModel> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: PublicityLevelModel) => dispatch(action.post({ values })),
    put: (values: PublicityLevelModel) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
  };
};
interface StatePublicityLevel<T> extends State<T> {
  isEdit?: boolean;
}
export class PublicityLevelModel extends CommonEntity {
  constructor(
    public id?: string,
    public title?: string,
    public code?: string,
    public translations?: string,
  ) {
    super();
  }
}
