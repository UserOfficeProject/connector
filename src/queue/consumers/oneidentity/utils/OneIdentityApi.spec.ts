jest.mock('axios');

import axios from 'axios';

import { OneIdentityApi } from './OneIdentityApi';

describe('OneIdentityApi', () => {
  let api: OneIdentityApi;

  beforeEach(() => {
    (axios.create as jest.Mock).mockReturnValue(axios);
    api = new OneIdentityApi('http://localhost');
  });

  describe('login', () => {
    it('should login successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({
        headers: { 'set-cookie': 'test-cookie' },
      });

      await api.login('user', 'password');

      expect(axios.post).toHaveBeenCalledWith(
        '/auth/apphost',
        {
          module: 'DialogUser',
          props: [
            {
              name: 'User',
              type: 'Edit',
              display: 'User',
              value: 'user',
              isMandatory: true,
            },
            {
              name: 'Password',
              type: 'Password',
              display: 'Password',
              value: 'password',
              isMandatory: false,
            },
          ],
          config: [],
        },
        {
          baseURL: 'http://localhost',
        }
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      (axios.post as jest.Mock).mockResolvedValueOnce({});

      await api.logout();

      expect(axios.post).toHaveBeenCalledWith('/auth/logout', undefined, {
        baseURL: 'http://localhost',
      });
    });
  });

  describe('createEntity', () => {
    it('should create entity successfully', async () => {
      const mockEntity = { id: 1, name: 'test' };
      (axios.post as jest.Mock).mockResolvedValueOnce({ data: mockEntity });

      const result = await api.createEntity('testTable', mockEntity);

      expect(axios.post).toHaveBeenCalledWith('/entity/testTable', {
        values: mockEntity,
      });
      expect(result).toEqual(mockEntity);
    });
  });

  describe('getEntities', () => {
    it('should get entities successfully', async () => {
      const mockEntities = [{ id: 1, name: 'test' }];
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: mockEntities });

      const result = await api.getEntities('testTable', 'id=1');

      expect(axios.get).toHaveBeenCalledWith('/entities/testTable', {
        params: { where: 'id=1' },
      });
      expect(result).toEqual(mockEntities);
    });
  });

  describe('deleteEntity', () => {
    it('should delete entity successfully', async () => {
      (axios.delete as jest.Mock).mockResolvedValueOnce({});

      await api.deleteEntity('testTable', '1');

      expect(axios.delete).toHaveBeenCalledWith('/entity/testTable/1');
    });
  });
});
