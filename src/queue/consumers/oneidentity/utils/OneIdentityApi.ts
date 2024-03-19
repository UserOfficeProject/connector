import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface CreateEntityResult {
  uid?: string;
  uri?: string;
}

interface EntityValues<T> {
  values: T;
}

// This class is a basic wrapper around the OneIdentity API
export class OneIdentityApi {
  private baseUrl: string;
  private apiUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(url: string) {
    this.baseUrl = url;
    this.apiUrl = `${this.baseUrl}/api`;
    this.axiosInstance = this.createAxiosInstance();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.apiUrl,
      withCredentials: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }

  public async login(user: string, password: string): Promise<void> {
    const res = await this.axiosInstance.post(
      '/auth/apphost',
      {
        module: 'DialogUser',
        props: [
          {
            name: 'User',
            type: 'Edit',
            display: 'User',
            value: user,
            isMandatory: true,
          },
          {
            name: 'Password',
            type: 'Password',
            display: 'Password',
            value: password,
            isMandatory: false,
          },
        ],
        config: [],
      },
      {
        baseURL: this.baseUrl,
      }
    );

    if (!res.headers['set-cookie']) throw new Error('No cookie set');

    // We need to set the cookie for the following requests
    // It contains the session information
    this.axiosInstance.defaults.headers.Cookie = res.headers['set-cookie'];
  }

  public logout(): Promise<void> {
    return this.axiosInstance.post('/auth/logout', undefined, {
      baseURL: this.baseUrl,
    });
  }

  public async createEntity<T>(
    table: string,
    values: T
  ): Promise<CreateEntityResult> {
    const { data } = await this.axiosInstance.post<
      T,
      AxiosResponse<CreateEntityResult>
    >(`/entity/${table}`, {
      values,
    });

    return data;
  }

  public async getEntities<T>(
    table: string,
    where: string
  ): Promise<EntityValues<T>[]> {
    const { data } = await this.axiosInstance.get<
      T,
      AxiosResponse<EntityValues<T>[]>
    >(`/entities/${table}`, {
      params: { where },
    });

    return data;
  }

  public deleteEntity(table: string, uid: string): Promise<void> {
    return this.axiosInstance.delete(`/entity/${table}/${uid}`);
  }
}
