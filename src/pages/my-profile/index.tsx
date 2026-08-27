import { Tabs, Image, Button as AntButton } from 'antd';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import React from 'react';
import { Button } from '@core/button';
import { Form } from '@core/form';
import { EFormRuleType, EFormType } from '@models';
import { EStatusGlobal, EStatusUser, GlobalFacade, UserFacade } from '@store';
import { User } from '@svgs';
import { lang, linkApi, routerLinks } from '@utils';
import { useSearchParams } from 'react-router-dom';
import { UploadOutlined } from '@ant-design/icons';

const Page: React.FC = () => {
  const { user, isLoading, profile, status, putProfile, data, changePasswordProfile } = GlobalFacade();
  const userFacade = UserFacade();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const [activeKey, setActiveKey] = useState<string>(tab || '1');
  useEffect(() => {
    if (tab) setActiveKey(tab);
    const navList = document.querySelector<HTMLElement>('.ant-tabs-nav-list')!;
    const mediaQuery = window.matchMedia('(max-width: 375px)');

    if (tab === '2' && mediaQuery.matches) navList.style.transform = 'translate(-49px, 0px)';
    else navList.style.transform = 'translate(0px, 0px)';
  }, [tab]);
  const navigate = useNavigate();
  const onChangeTab = (key: string) => {
    setActiveKey(key);
    navigate(`/${lang}${routerLinks('MyProfile')}?tab=${key}`);
  };
  const { t } = useTranslation();
  const handleUploadAvatar = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file, file.name);
      const r = await fetch(linkApi + `/upload/blob/user_avatar`, {
        method: 'POST',
        body: formData,
      });
      const data = await r.json();
      userFacade.putAvatar(user?.userId ?? '', data?.data?.fileUrl);
    };
    input.click();
  };

  useEffect(() => {
    profile();
  }, []);

  useEffect(() => {
    switch (status) {
      case EStatusGlobal.putProfileFulfilled:
        profile();
        break;
    }
  }, [status]);

  useEffect(() => {
    switch (userFacade.status) {
      case EStatusUser.putAvatarFulfilled:
        profile();
        break;
    }
  }, [userFacade.status]);

  return (
    <Fragment>
      <div className="max-w-5xl mx-auto flex lg:flex-row flex-col w-full lg:p-4">
        <div className="flex-initial lg:w-[250px] mr-5 lg:rounded-xl w-full bg-white pt-6 flex flex-col items-center">
          {/* <Upload
            name="file"
            listType="picture-card"
            showUploadList={false}
            action={linkApi + `/upload/blob/user_avatar`}
            onChange={handleChange}
          >
            {imageUrl ? <img src={imageUrl} alt="avatar" style={{ width: '100%' }} /> : uploadButton}
          </Upload> */}
          <AntButton icon={<UploadOutlined />} onClick={handleUploadAvatar}>
            Tải lên
          </AntButton>
          <div className="size-40 overflow-hidden rounded-xl flex items-center justify-center mt-2">
            <Image
              src={user?.userModel?.avatarUrl ?? '/assets/images/avatar.jpeg'}
              alt="avatar"
              className="object-cover aspect-square object-center"
            />
          </div>
          <p className="text-xl font-bold mt-6">{user?.userModel?.name}</p>
          <div className="mt-2 mb-3">
            <User className="size-5 mr-2 fill-slate-500" />
          </div>
        </div>
        <div className="flex-1 lg:rounded-xl w-auto">
          <Tabs
            onTabClick={(key: string) => onChangeTab(key)}
            activeKey={activeKey}
            size="large"
            className="profile"
            items={[
              {
                key: '1',
                label: t('routes.admin.Layout.My Profile'),
                children: (
                  <div className={'bg-white rounded-b-xl p-5'}>
                    <Form
                      values={{ ...data?.userModel }}
                      columns={[
                        {
                          title: 'routes.admin.user.Full name',
                          name: 'name',
                          formItem: {
                            col: 12,
                            rules: [{ type: EFormRuleType.required }],
                          },
                        },
                        {
                          title: 'Email',
                          name: 'email',
                          formItem: {
                            col: 6,
                            rules: [
                              { type: EFormRuleType.required },
                              { type: EFormRuleType.email },
                              { type: EFormRuleType.min, value: 6 },
                            ],
                            disabled: () => true,
                          },
                        },
                        {
                          title: 'routes.admin.user.Phone Number',
                          name: 'phoneNumber',
                          formItem: {
                            col: 6,
                            rules: [{ type: EFormRuleType.required }, { type: EFormRuleType.phone, min: 10, max: 15 }],
                          },
                        },
                        {
                          title: 'routes.admin.user.Date of birth',
                          name: 'birthdate',
                          formItem: {
                            col: 6,
                            type: EFormType.date,
                          },
                        },
                        {
                          title: 'Giới tính',
                          name: 'gender',
                          formItem: {
                            col: 6,
                            type: EFormType.select,
                            list: [
                              {
                                label: 'Nữ',
                                value: 'FEMALE',
                              },
                              {
                                label: 'Nam',
                                value: 'MALE',
                              },
                            ],
                          },
                        },
                      ]}
                      disableSubmit={isLoading}
                      handSubmit={(values) => {
                        // putProfile({ ...data?.userModel, ...values, avatar: forms.getFieldValue('avatar')[0].url });
                        putProfile({ ...data?.userModel, ...values });
                      }}
                      extendButton={() => (
                        <Button
                          text={t('components.datatable.cancel')}
                          className={'md:w-32 justify-center out-line max-sm:w-3/5'}
                          onClick={() => {
                            navigate(`/${lang}${routerLinks('MyProfile')}`);
                          }}
                        />
                      )}
                    />
                  </div>
                ),
              },
              {
                key: '2',
                label: t('routes.admin.Layout.Change Password'),
                children: (
                  <div className={'bg-white rounded-b-xl p-5'}>
                    <Form
                      values={{ ...data?.userModel }}
                      columns={[
                        {
                          title: 'columns.auth.login.New password',
                          name: 'password',
                          formItem: {
                            col: 12,
                            type: EFormType.password,
                            rules: [{ type: EFormRuleType.required }],
                          },
                        },
                        {
                          title: 'columns.auth.login.Confirm Password',
                          name: 'retypedPassword',
                          formItem: {
                            notDefaultValid: true,
                            col: 12,
                            type: EFormType.password,
                            rules: [
                              {
                                type: EFormRuleType.custom,
                                validator: ({ getFieldValue }) => ({
                                  validator(_, value: string) {
                                    const errorMsg = t('components.form.ruleConfirmPassword');
                                    if (!value || getFieldValue('password') === value) {
                                      return Promise.resolve();
                                    }
                                    return Promise.reject(new Error(errorMsg));
                                  },
                                }),
                              },
                              { type: EFormRuleType.required },
                            ],
                          },
                        },
                      ]}
                      disableSubmit={isLoading}
                      extendButton={() => (
                        <Button
                          text={t('components.datatable.cancel')}
                          className={'md:min-w-32 justify-center out-line max-sm:w-3/5'}
                          onClick={() => {
                            navigate(`/${lang}${routerLinks('MyProfile')}`);
                          }}
                        />
                      )}
                      textSubmit="routes.admin.Layout.Change Password"
                      handSubmit={(values) => {
                        // const { name, email, phoneNumber, dob, positionCode, description } = user!;
                        // putProfile({ name, email, phoneNumber, dob, positionCode, description, ...values });
                        changePasswordProfile({ id: data?.userId, password: values?.password });
                      }}
                    />
                  </div>
                ),
              },
            ]}
          ></Tabs>
        </div>
      </div>
    </Fragment>
  );
};
export default Page;
