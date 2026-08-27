import { Popover, Button, Typography, Divider, Empty } from 'antd';
import React, { useMemo } from 'react';
import { DeleteOutlined, ExclamationCircleFilled, ExclamationCircleOutlined } from '@ant-design/icons';
import { NotificationFacade, NotificationModel } from '@store';
import dayjs, { Dayjs } from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import { lang, routerLinks } from '@utils';
import { useLocation, useNavigate } from 'react-router';
import { useSearchParams } from 'react-router-dom';
import { unwrapResult } from '@reduxjs/toolkit';
import { customModal } from 'src';

dayjs.extend(isToday);

interface NotificationDropdownProps {
  children?: React.ReactNode;
}

function getTheMinus(date2: string) {
  const startDate = dayjs(date2);
  const endDate = dayjs();
  const units = [
    { unit: 'ngày', value: endDate.diff(startDate, 'day') },
    { unit: 'giờ', value: endDate.diff(startDate, 'hour') % 24 },
    { unit: 'phút', value: endDate.diff(startDate, 'minute') % 60 },
    { unit: 'giây', value: endDate.diff(startDate, 'second') % 60 },
  ];

  const largestUnit = units.find(({ value }) => value > 0);
  return largestUnit ? `${largestUnit.value} ${largestUnit.unit}` : '0 second(s)';
}

const notificationSections: {
  name: string;
  condition: (n: NotificationModel, today?: Dayjs) => boolean;
}[] = [
  {
    name: 'Hôm nay',
    condition: (x) => dayjs(x.createdOnDate).isToday(),
  },
  {
    name: 'Trước đó',
    condition: (x, y) => dayjs(x.createdOnDate).isBefore(y),
  },
];

const PopoverContent: React.FC = () => {
  const notificationFacade = NotificationFacade();
  const navigate = useNavigate();
  const [_, setSearchParams] = useSearchParams();
  const location = useLocation();
  const notifications = useMemo(() => {
    const today = dayjs().startOf('D');
    return notificationSections.map((x) => ({
      name: x.name,
      data:
        (notificationFacade.isViewPrev ? notificationFacade.list : notificationFacade.list?.slice(0, 7))?.filter((n) =>
          x.condition(n, today),
        ) ?? [],
    }));
  }, [notificationFacade.list]);

  function onNotificationClicked(notification: NotificationModel) {
    if (!notification.isRead) {
      notificationFacade.markAsRead([notification.id]);
    }

    if (!notification.orderId) return;

    const orderRouterLink = routerLinks('DonHang');

    if (location.pathname.includes(orderRouterLink)) {
      setSearchParams((x) => {
        x.set('orderId', notification.orderId);
        return x;
      });
    } else {
      navigate(`/${lang}${orderRouterLink}?orderId=${notification.orderId}`);
    }
  }

  async function viewPrev() {
    if (!notificationFacade.isViewPrev) {
      notificationFacade.set({
        isViewPrev: true,
      });
    }

    if (!notificationFacade.isPrevAvailable) return;

    const action = await notificationFacade.get({ page: (notificationFacade.pagination?.page ?? 0) + 1, size: 8 });
    const response = unwrapResult(action);

    if (!response.data) return;

    const notiList = notificationFacade.list ?? [];
    const newNotiList = response.data?.content ?? [];

    notiList.forEach((x, i) => {
      const newNotiIndex = newNotiList.findIndex((n) => n.id === x.id);

      if (newNotiIndex == -1) return;

      notiList[i] = newNotiList[newNotiIndex];
      newNotiList.splice(newNotiIndex, 1);
    });

    notificationFacade.set({
      list: [...notiList, ...newNotiList],
      isPrevAvailable: response.data.page < response.data.totalPages,
    });
  }

  function deleteAll() {
    customModal.confirm({
      title: 'Xóa tất cả thông báo?',
      icon: <ExclamationCircleFilled />,
      content: 'Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?',
      okText: 'Xoá',
      cancelText: 'Huỷ',
      onOk() {
        notificationFacade.deleteAll();
      },
    });
  }

  return (
    <div className="-m-3 w-96 rounded-lg overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex px-4 py-2 justify-between items-center">
          <Typography.Title level={4} className="!m-0">
            Thông báo
          </Typography.Title>
          {notifications.some((x) => x.data.length) && (
            <Button
              variant="link"
              color="danger"
              className="p-0 size-8 flex justify-center items-center"
              onClick={deleteAll}
            >
              <DeleteOutlined className="text-xl" />
            </Button>
          )}
        </div>
        {notifications.every((x) => x.data.length === 0) && (
          <>
            <Divider className="m-0" />
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Danh sách thông báo trống" />
          </>
        )}
        {notifications
          .filter((x) => x.data.length > 0)
          .map((section) => (
            <React.Fragment key={section.name}>
              <Divider className="m-0" />
              <div className="px-4 py-2">
                <Typography.Title level={5} className="!m-0">
                  {section.name}
                </Typography.Title>
              </div>
              <Divider className="m-0" />
              <div>
                {section.data.map((n, i) => (
                  <div
                    key={i}
                    className={`px-4 py-2 flex gap-2 justify-evenly cursor-pointer ${n.isRead ? 'bg-white' : 'bg-cyan-50'}`}
                    onClick={() => onNotificationClicked(n)}
                  >
                    <div className="size-14 p-1">
                      {n.type === 'LateDelivery' ? (
                        <ExclamationCircleOutlined className="text-red-500 text-5xl" />
                      ) : (
                        <img
                          className="w-full h-full object-cover rounded-full"
                          src={
                            n.imageUrl ||
                            'https://gratisography.com/wp-content/uploads/2024/10/gratisography-cool-cat-800x525.jpg'
                          }
                          alt="image"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <Typography.Paragraph ellipsis={{ rows: 2 }} className="!m-0">
                        {n.partedTitle.map((x, i) => {
                          if (x == null) {
                            return <span key={i}></span>;
                          }

                          return i % 2 === 0 ? (
                            <span key={i} className="font-medium">
                              {x}
                            </span>
                          ) : (
                            <span key={i}> {x} </span>
                          );
                        })}
                      </Typography.Paragraph>
                      <span className="text-gray-500">{getTheMinus(n.createdOnDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </React.Fragment>
          ))}
        <div className="p-4">
          <Button
            color="default"
            variant="filled"
            className="w-full font-medium border border-gray-200 hover:border-gray-300 active:border-gray-400"
            onClick={viewPrev}
            disabled={!notificationFacade.isPrevAvailable}
            loading={notificationFacade.isLoading}
          >
            {notificationFacade.isPrevAvailable ? 'Xem thông báo trước đó' : 'Không có thông báo trước đó'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const MemoizedPopoverContent = React.memo(PopoverContent);

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ children }) => {
  return (
    <Popover zIndex={1000} trigger={['hover']} placement="bottomLeft" content={<MemoizedPopoverContent />}>
      {children}
    </Popover>
  );
};

export default NotificationDropdown;
