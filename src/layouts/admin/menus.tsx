import React from 'react';
import { URLSearchParamsInit } from 'react-router-dom/dist/dom';

import { keyRole } from '@utils';
import './index.less';
import { Calendar, Cog, User } from '@svgs';

const Layout: IMenu[] = [
  {
    icon: <Calendar className="h-6 w-6" />,
    name: 'Dashboard',
  },
  {
    icon: <User className="h-6 w-6" />,
    name: 'User',
    permission: keyRole.P_USER_LISTED,
    queryParams: { filter: '{"roleCode":"FARMER"}' },
  },
  {
    icon: <Cog className="h-6 w-6" />,
    name: 'Setting',
    child: [
      {
        name: 'Code',
        permission: keyRole.P_CODE_LISTED,
        queryParams: { filter: '{"type":"MEDICAL_PROCEDURE_GROUP"}' },
      },
      {
        name: 'Data',
        permission: keyRole.P_DATA_LISTED,
        queryParams: { filter: '{"type":"12"}' },
      },
      {
        name: 'Post',
        permission: keyRole.P_POST_LISTED,
        queryParams: {},
      },
      {
        name: 'Parameter',
        permission: keyRole.P_PARAMETER_LISTED,
        // queryParams: { code: 'phone' },
      },
      {
        name: 'Navigation',
      },
      {
        name: 'Folders',
      },
    ],
  },
];

export default Layout;

interface IMenu {
  name: string;
  icon?: React.JSX.Element;
  permission?: keyRole;
  queryParams?: URLSearchParamsInit;
  child?: IMenu[];
}
