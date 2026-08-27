// import _column from '@column/user';
// import { Button } from '@core/button';
// import { DataTable } from '@core/data-table';
// import { DrawerForm } from '@core/drawer';
// import { EStatusState, TableRefObject } from '@models';
// import { EStatusUser, RoleFacade, User, UserFacade } from '@store';
// import { Arrow, Plus } from '@svgs';
// import { lang, mapTreeObject, routerLinks } from '@utils';
// import { Select, Spin, Tree } from 'antd';
// import classNames from 'classnames';
// import { useEffect, useRef } from 'react';
// import { useTranslation } from 'react-i18next';
// import { useNavigate } from 'react-router';
// import './index.less';
// const Page = () => {
//   const userRoleFacade = RoleFacade();
//   useEffect(() => {
//     if (!userRoleFacade?.pagination) userRoleFacade.get({});
//     return () => {
//       userFacade.set({ isLoading: true, status: EStatusState.idle });
//     };
//   }, []);

//   const navigate = useNavigate();

//   const userFacade = UserFacade();
//   useEffect(() => {
//     switch (userFacade.status) {
//       case EStatusState.postFulfilled:
//       case EStatusState.putFulfilled:
//       case EStatusState.deleteFulfilled:
//       case EStatusUser.lockFulfilled:
//       case EStatusUser.unlockFulfilled:
//         userFacade.set({ data: undefined, isVisible: false });
//         dataTableRef?.current?.onChange(request);
//         break;
//     }
//   }, [userFacade.status]);
//   const request = JSON.parse(userFacade?.queryParams || '{}');
//   if (!request.filter || typeof request?.filter === 'string') request.filter = JSON.parse(request?.filter || '{}');
//   const { t } = useTranslation();
//   const dataTableRef = useRef<TableRefObject>(null);
//   return (
//     <div id="pages-users" className={'grid grid-cols-12 gap-3 px-2.5 pt-2.5'}>
//       <DrawerForm
//         facade={userFacade}
//         title={t(userFacade.data ? 'pages.User/Edit' : 'pages.User/Add', { roleCode: '' })}
//         onSubmit={(values) => {
//           const data: User = {
//             ...values,
//             roleListCode: [request.filter.roleCode],
//           };
//           console.log(data);

//           if (userFacade.data) userFacade.put({ ...data, id: userFacade.data.id });
//           else userFacade.post({ ...data });
//         }}
//         columns={_column.form()}
//       ></DrawerForm>
//       <DrawerForm
//         facade={userFacade}
//         title={'Đổi mật khẩu'}
//         onSubmit={(values) => {
//           userFacade.changePassword(userFacade?.data?.id || '', values.oldPassword, values.password);
//         }}
//         columns={_column.formChangePass()}
//         keyState={'isVisibleChangePass'}
//       ></DrawerForm>
//       <div className="col-span-12 md:col-span-4 lg:col-span-3 -intro-x">
//         <div className="shadow rounded-xl w-full bg-white overflow-hidden">
//           <div className="h-14 flex justify-between items-center border-b border-gray-100 px-4 py-2">
//             <h3 className={'font-bold text-lg'}>Role</h3>
//           </div>
//           <Spin spinning={userRoleFacade.isLoading}>
//             <div className="h-[calc(100vh-12rem)] overflow-y-auto relative scroll hidden sm:block">
//               <Tree
//                 blockNode
//                 showLine
//                 autoExpandParent
//                 defaultExpandAll
//                 switcherIcon={<Arrow className={'w-4 h-4'} />}
//                 treeData={mapTreeObject(userRoleFacade.pagination?.content)}
//                 titleRender={(data: any) => (
//                   <div
//                     className={classNames(
//                       { 'bg-gray-100': request.filter.roleCode === data.value },
//                       'item text-gray-700 font-medium hover:bg-gray-100 flex justify-between items-center border-b border-gray-100 w-full text-left  group',
//                     )}
//                   >
//                     <div
//                       onClick={() => {
//                         request.filter.roleCode = data.value;
//                         dataTableRef?.current?.onChange(request);
//                       }}
//                       className="truncate cursor-pointer flex-1 hover:text-teal-900 item-text px-3 py-1"
//                     >
//                       {data.title}
//                     </div>
//                   </div>
//                 )}
//               />
//             </div>
//             <div className="p-2 sm:p-0 block sm:hidden">
//               <Select
//                 value={request.filter.roleCode}
//                 className={'w-full'}
//                 options={userRoleFacade?.pagination?.content?.map((data: any) => ({
//                   label: data.name,
//                   value: data.code,
//                 }))}
//                 onChange={(e) => {
//                   request.filter.roleCode = e;
//                   dataTableRef?.current?.onChange(request);
//                 }}
//               />
//             </div>
//           </Spin>
//         </div>
//       </div>
//       <div className="col-span-12 md:col-span-8 lg:col-span-9 intro-x">
//         <div className="shadow rounded-xl w-full overflow-auto bg-white">
//           <div className="sm:min-h-[calc(100vh-8.5rem)] overflow-y-auto p-3">
//             <DataTable
//               facade={userFacade}
//               ref={dataTableRef}
//               onRow={(record) => ({
//                 onDoubleClick: () => navigate(`/${lang}${routerLinks('User')}/${record.id}/edit`),
//               })}
//               columns={_column.table()}
//               rightHeader={
//                 <div className={'flex gap-2'}>
//                   <Button
//                     icon={<Plus className="icon-cud !h-5 !w-5" />}
//                     text={t('components.button.New')}
//                     onClick={() => userFacade.set({ data: undefined, isVisible: true })}
//                   />
//                 </div>
//               }
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// export default Page;
