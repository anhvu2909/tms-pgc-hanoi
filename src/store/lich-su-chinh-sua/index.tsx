import { CommonEntity, QueryParams } from '@models';
import { createSlice } from '@reduxjs/toolkit';
import { Action, Slice, State, useAppDispatch, useTypedSelector } from '@store';

const name = 'LichSuChinhSua';

const action = new Action<LichSuChinhSua>(name);
export const lichSuChinhSuaSlice = createSlice(new Slice<LichSuChinhSua>(action));
export const LichSuChinhSuaFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateLichSuChinhSua<LichSuChinhSua>),
    set: (values: StateLichSuChinhSua<LichSuChinhSua>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({ id, keyState = 'isVisible' }: { id: string; keyState?: keyof StateLichSuChinhSua<LichSuChinhSua> }) =>
      dispatch(action.getById({ id, keyState })),
    post: (values: LichSuChinhSua) => dispatch(action.post({ values })),
    put: (values: LichSuChinhSua) => dispatch(action.put({ values })),
    putDisable: (values: { id: string; disable: boolean }) => dispatch(action.putDisable(values)),
    delete: (id: string) => dispatch(action.delete({ id })),
  };
};

interface StateLichSuChinhSua<T> extends State<T> {
  isEdit?: boolean;
}

export class LichSuChinhSua extends CommonEntity {
  constructor(
    public entityId?: string,
    public entityType?: string,
    public actionMadeByUserName?: string,
    public actionMadeByUserFullName?: string,
    public actionMadeByUserId?: string,
    public actionMadeOnDate?: string,
    public action?: string,
    public description?: string,
    public additional?: any,
    public isDeleted?: any,
  ) {
    super();
  }
}
