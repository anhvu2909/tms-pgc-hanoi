import React, { useEffect, useRef, useState } from 'react';
import { FallOutlined, RiseOutlined } from '@ant-design/icons';
import { Card, Radio, Select, Spin, Statistic } from 'antd';
import { DashboardFacade, EStatusDashboard } from 'src/store/dashboard';
import { RadioChangeEvent } from 'antd/lib';
import DashboardGanttChart from './gantt-chart';
const Page = () => {
  const chartRef = useRef(null);
  const barChartTopCustomerRef = useRef(null);
  const barChartTopProductRef = useRef(null);
  const pieChartRef = useRef(null);
  const dashboardFacade = DashboardFacade();

  const [filterRevenue, setFilterRevenue] = useState<string>('DAY');

  const handleRevenueChange = (e: RadioChangeEvent) => {
    dashboardFacade.getRevenueOverTime(e.target.value);
    setFilterRevenue(e.target.value);
  };

  useEffect(() => {
    dashboardFacade.getDashboardsWithNoFilter();
    dashboardFacade.getRevenueOverTime('DAY');
  }, []);

  useEffect(() => {
    if (!EStatusDashboard.dashboardsWithNoFilterFulfilled) {
      return;
    }
    const barChartTopCustomerInstance = echarts.init(barChartTopCustomerRef.current);
    const barChartTopProductInstance = echarts.init(barChartTopProductRef.current);
    const pieChartInstance = echarts.init(pieChartRef.current);
    const optionTopCustomer = {
      title: {
        text: 'Top 5 khách hàng theo doanh thu',
        left: 'center',
        textStyle: {
          fontFamily: 'Segoe UI',
          fontWeight: 'bold',
          fontSize: '15',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      grid: {
        left: '3%',
        right: '15%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        name: 'DT (vnd)',
        type: 'value',
        boundaryGap: [0, 0.01],
        nameTextStyle: {
          verticalAlign: 'center',
          padding: [0, 0, 0, 13],
        },
      },
      yAxis: {
        type: 'category',
        data: dashboardFacade.topCustomersWithRevenue?.metaObjects,
        axisLabel: {
          width: '160',
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: dashboardFacade.topCustomersWithRevenue?.dataObjects.data,
          itemStyle: {
            color: function (params: any) {
              const colorList = ['#edc951', '#eb6841', '#cc2a36', '#4f372d', '#00a0b0'];
              return colorList[params.dataIndex];
            },
          },
        },
      ],
    };

    const optionTopProduct = {
      title: {
        text: 'Top 5 sản phẩm bán chạy',
        left: 'center',
        textStyle: {
          fontFamily: 'Segoe UI',
          fontWeight: 'bold',
          fontSize: '15',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dashboardFacade.bestSellingProducts?.metaObjects,
        axisLabel: {
          width: '100',
          overflow: 'truncate',
        },
      },
      yAxis: {
        name: 'Số lượng',
        type: 'value',
        nameTextStyle: {
          align: 'right',
        },
      },
      series: [
        {
          data: dashboardFacade.bestSellingProducts?.dataObjects.data,
          type: 'bar',
          itemStyle: {
            color: function (params: any) {
              const colorList = ['#edc951', '#eb6841', '#cc2a36', '#4f372d', '#00a0b0'];
              return colorList[params.dataIndex];
            },
          },
        },
      ],
    };

    const pieOption = {
      title: {
        text: 'Đơn hàng cần xử lý theo trạng thái',
        left: 'center',
        textStyle: {
          fontFamily: 'Segoe UI',
          fontWeight: 'bold',
          fontSize: '15',
        },
      },
      tooltip: {
        trigger: 'item',
      },
      legend: {
        orient: 'horizontal',
        top: 'bottom',
      },
      series: [
        {
          name: 'Trạng thái',
          type: 'pie',
          radius: '50%',
          color: dashboardFacade.orderWithStatus?.dataObjects.colorPalette,
          data: dashboardFacade.orderWithStatus?.metaObjects.map((name: any, index: string | number) => ({
            value: dashboardFacade.orderWithStatus?.dataObjects.data[index],
            name,
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };

    barChartTopCustomerInstance.setOption(optionTopCustomer);
    barChartTopProductInstance.setOption(optionTopProduct);
    pieChartInstance.setOption(pieOption);
    const handleResize = () => {
      barChartTopCustomerInstance.resize();
      barChartTopProductInstance.resize();
      pieChartInstance.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      barChartTopCustomerInstance.dispose();
      barChartTopProductInstance.dispose();
      pieChartInstance.dispose();
    };
  }, [dashboardFacade.noRenderData]);

  useEffect(() => {
    if (!EStatusDashboard.revenueOverTimeFulfilled) {
      return;
    }
    const chartInstance = echarts.init(chartRef.current);

    const option = {
      title: {
        left: 'center',
        textStyle: {
          fontFamily: 'Segoe UI',
          fontWeight: 'bold',
          fontSize: '15',
        },
      },
      tooltip: {
        trigger: 'axis',
        position: function (pt: any) {
          return [pt[0], '10%'];
        },
      },
      xAxis: {
        type: 'category',
        data: dashboardFacade.revenueOverTime?.metaObjects,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: dashboardFacade.revenueOverTime?.dataObjects.data,
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#0c457d',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: '#ffbe4f',
              },
              {
                offset: 1,
                color: '#e8702a',
              },
            ]),
          },
        },
      ],
    };

    chartInstance.setOption(option);

    const handleResize = () => {
      chartInstance.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [dashboardFacade.renderData]);

  return (
    <>
      <div className="m-6">
        <DashboardGanttChart />
      </div>

      <div className="grid grid-cols-[4.5fr_9fr_2.5fr_2.5fr] grid-rows-10 gap-6 px-6 mt-6">
        <div className="row-span-4">
          <Card className="justify-between h-full" bordered={false}>
            <div className="flex flex-col items-center *:w-full">
              <span className="font-semibold text-gray-700 text-center mb-2">Doanh thu vận chuyển hôm nay</span>
              <Spin spinning={dashboardFacade.revenueAndTotalToday === undefined}>
                {dashboardFacade.revenueAndTotalToday !== undefined ? (
                  <div className="flex flex-row items-center justify-between w-full">
                    <Statistic
                      className="flex flex-col items-center w-2/3"
                      value={dashboardFacade.revenueAndTotalToday?.dataObjects.data.totalAmountNow}
                      valueStyle={{
                        color: '#27c390',
                        fontSize: '3rem',
                        lineHeight: 1,
                        fontWeight: 700,
                      }}
                      suffix={
                        <>
                          <span className="text-base text-gray-500"> (vnd)</span>
                        </>
                      }
                    />

                    <Statistic
                      className="flex flex-col-reverse items-center"
                      title={
                        <>
                          {dashboardFacade.revenueAndTotalToday?.dataObjects.data.totalAmountPercentYesterday < 0 ? (
                            <FallOutlined className="text-6xl text-red-800" />
                          ) : (
                            <RiseOutlined className="text-6xl text-green-800" />
                          )}
                          <span className="block"> Hôm qua</span>
                        </>
                      }
                      value={dashboardFacade.revenueAndTotalToday?.dataObjects.data.totalAmountPercentYesterday}
                      precision={2}
                      valueStyle={{
                        color:
                          dashboardFacade.revenueAndTotalToday?.dataObjects.data.totalAmountPercentYesterday < 0
                            ? '#fe4a49'
                            : '#27c390',
                        fontSize: '1.125rem',
                        lineHeight: '1.75rem',
                        fontWeight: 500,
                      }}
                      prefix={
                        dashboardFacade.revenueAndTotalToday?.dataObjects.data.totalAmountPercentYesterday >= 0
                          ? '+'
                          : ''
                      }
                      suffix={'%'}
                    />
                  </div>
                ) : (
                  <div className="h-28"></div>
                )}
              </Spin>
            </div>
          </Card>
        </div>
        <div className="row-span-11">
          <Card className="h-full">
            <div className="flex justify-center mb-2">
              <span className=" text-gray-900 text-center text-base font-bold mt-1">
                Doanh thu vận chuyển theo thời gian
              </span>
            </div>
            <div className=" absolute top-4 right-4">
              <Radio.Group onChange={handleRevenueChange} value={filterRevenue}>
                <Radio.Button value="DAY">Ngày</Radio.Button>
                <Radio.Button value="MONTH">Tháng</Radio.Button>
                <Radio.Button value="YEAR">Năm</Radio.Button>
              </Radio.Group>
            </div>
            <Spin spinning={dashboardFacade.revenueOverTime === undefined}>
              <div className="w-full min-h-full" ref={chartRef} style={{ height: '30rem' }} />
            </Spin>
          </Card>
        </div>
        <div className="row-span-3">
          <Card className="h-full">
            <Statistic
              className="flex flex-col-reverse items-center"
              value={dashboardFacade.overdueWithStatusDelivery?.dataObjects.data.declinedOrder}
              loading={dashboardFacade.overdueWithStatusDelivery == undefined}
              title={<span>Đơn đã huỷ</span>}
              valueStyle={{
                marginTop: '0.5rem',
                marginBottom: '0.75rem',
                color: '#ff4c4c',
                fontSize: '3rem',
                lineHeight: 1,
                fontWeight: 700,
              }}
            />
          </Card>
        </div>
        <div className="row-span-3">
          <Card className="h-full">
            <Statistic
              className="flex flex-col-reverse items-center"
              title={<span>Đơn hoàn thành</span>}
              loading={dashboardFacade.overdueWithStatusDelivery == undefined}
              value={dashboardFacade.overdueWithStatusDelivery?.dataObjects.data.completedOrder}
              valueStyle={{
                marginTop: '0.5rem',
                marginBottom: '0.75rem',
                color: '#27c390',
                fontSize: '3rem',
                lineHeight: 1,
                fontWeight: 700,
              }}
            />
          </Card>
        </div>
        <div className="row-span-8 col-span-2">
          <Card className="h-full">
            <Spin spinning={dashboardFacade.orderWithStatus === undefined}>
              <div className="w-full h-full" ref={pieChartRef} style={{ height: '21.5rem' }} />
            </Spin>
          </Card>
        </div>
        <div className="row-span-4">
          <Card className="justify-between h-full" bordered={false}>
            <div className="flex flex-col items-center *:w-full">
              <span className="font-semibold text-center text-gray-700 mb-2">Số đơn giao thành công hôm nay</span>
              <Spin spinning={dashboardFacade.revenueAndTotalToday === undefined}>
                {dashboardFacade.revenueAndTotalToday !== undefined ? (
                  <div className="flex flex-row items-center justify-between w-full">
                    <Statistic
                      className="flex flex-col items-center w-2/3"
                      value={dashboardFacade.revenueAndTotalToday?.dataObjects.data.quantityNow}
                      valueStyle={{
                        color: '#27c390',
                        fontSize: '3rem',
                        lineHeight: 1,
                        fontWeight: 700,
                      }}
                      suffix={<span className="text-base text-gray-500"></span>}
                    />
                    <Statistic
                      className="flex flex-col-reverse items-center"
                      title={
                        <>
                          {dashboardFacade.revenueAndTotalToday?.dataObjects.data.quantityPercentYesterday < 0 ? (
                            <FallOutlined className="text-6xl text-red-800" />
                          ) : (
                            <RiseOutlined className="text-6xl text-green-800" />
                          )}
                          <span className="block"> Hôm qua</span>
                        </>
                      }
                      value={dashboardFacade.revenueAndTotalToday?.dataObjects.data.quantityPercentYesterday}
                      precision={2}
                      valueStyle={{
                        color:
                          dashboardFacade.revenueAndTotalToday?.dataObjects.data.quantityPercentYesterday < 0
                            ? '#fe4a49'
                            : '#27c390',
                        fontSize: '1.125rem',
                        lineHeight: '1.75rem',
                        fontWeight: 500,
                      }}
                      prefix={
                        dashboardFacade.revenueAndTotalToday?.dataObjects.data.quantityPercentYesterday >= 0 ? '+' : ''
                      }
                      suffix={'%'}
                    />
                  </div>
                ) : (
                  <div className="h-28"></div>
                )}
              </Spin>
            </div>
          </Card>
        </div>
        <div className="row-span-3">
          <Card className="flex justify-center h-full" bordered={false}>
            <span className="font-semibold text-gray-700">Số đơn quá hạn giao</span>
            <Statistic
              className="flex flex-col items-center"
              loading={dashboardFacade.overdueWithStatusDelivery == undefined}
              value={dashboardFacade.overdueWithStatusDelivery?.dataObjects.data.now}
              suffix={<span className="text-base text-gray-500"> </span>}
              valueStyle={{
                marginTop: '0.5rem',
                color: '#ff4c4c',
                fontSize: '3rem',
                lineHeight: 1,
                fontWeight: 700,
              }}
            />
          </Card>
        </div>
      </div>

      <div className="m-6 mt-6 grid grid-cols-2 gap-6">
        <Card className="h-full">
          <Spin spinning={dashboardFacade.topCustomersWithRevenue === undefined}>
            <div className="w-full h-full" ref={barChartTopCustomerRef} style={{ width: '100%', height: '26rem' }} />
          </Spin>
        </Card>
        <Card className="h-full">
          <Spin spinning={dashboardFacade.bestSellingProducts === undefined}>
            <div className="w-full h-full" ref={barChartTopProductRef} style={{ width: '100%', height: '26rem' }} />
          </Spin>
        </Card>
      </div>
    </>
  );
};
export default Page;
