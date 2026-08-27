import { CommonEntity, QueryParams } from '@models';
import { createSlice } from '@reduxjs/toolkit';
import { Action, Slice, State, useAppDispatch, User, useTypedSelector } from '@store';

const name = 'LichSuChamSoc';

const action = new Action<LichSuChamSocModel>(name);

export const lichSuChamSocSlice = createSlice(new Slice<LichSuChamSocModel>(action));

export const LichSuChamSocFacade = () => {
  const dispatch = useAppDispatch();
  return {
    ...useTypedSelector((state) => state[action.name] as StateLichSuChamSoc<LichSuChamSocModel>),
    set: (values: StateLichSuChamSoc<LichSuChamSocModel>) => dispatch(action.set(values)),
    get: (params: QueryParams) => dispatch(action.get(params)),
    getById: ({
      id,
      keyState = 'isVisible',
    }: {
      id: string;
      keyState?: keyof StateLichSuChamSoc<LichSuChamSocModel>;
    }) => dispatch(action.getById({ id, keyState })),
    post: (values: LichSuChamSocModel) => dispatch(action.post({ values })),
    put: (values: LichSuChamSocModel) => dispatch(action.put({ values })),
    delete: (id: string) => dispatch(action.delete({ id })),
  };
};

interface StateLichSuChamSoc<T> extends State<T> {
  isEdit?: boolean;
}

export class LichSuChamSocModel extends CommonEntity {
  constructor(
    public id: string,
    public khachHangId: string,
    public ghiChu: string,
    public danhGia: string,
    public createdByUser: User,
    public createdOnDate: string,
  ) {
    super();
  }
}
