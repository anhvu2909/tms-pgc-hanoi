export class Responses<T> {
  constructor(
    public code?: 200 | 400 | 401 | 404 | 500,
    public message?: string,
    public data?: T,
    public count?: number,
    public isSuccess?: boolean,
    public totalTime?: number,
  ) {}
}

export class CommonEntity {
  constructor(
    public id?: string,
    public createdByUserId?: string,
    public lastModifiedByUserId?: string,
    public lastModifiedOnDate?: string,
    public createdOnDate?: string,
    public createdByUserName?: string,
    public createdByUserFullName?: string,
    public lastModifiedByUserName?: string,
  ) {}
}

export class QueryParams {
  constructor(
    public id?: string,
    public size?: number,
    public page?: number,
    public filter?: string,
    public sort?: string,
    public fullTextSearch?: string,
  ) {}
}

export class Pagination<T> {
  constructor(
    public content: T[],
    public numberOfElements: number,
    public page: number,
    public size: number,
    public totalElements: number,
    public totalPages: number,
  ) {}
}
