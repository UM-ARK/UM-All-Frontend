import {logHarborAuthError} from '../harborLogger';

describe('Harbor 授權日誌', () => {
    it('只記錄安全錯誤資訊，不輸出請求憑證', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const error = new Error('Network Error');
        error.code = 'ERR_NETWORK';
        error.response = {status: 503, data: {payload: 'secret-payload'}};
        error.config = {
            headers: {'User-Api-Key': 'secret-api-key'},
            url: '/callback?payload=secret-payload',
        };

        logHarborAuthError('request.failed', error, {stage: 'profile_fetch'});

        expect(logSpy).toHaveBeenCalledWith('[HarborAuth] request.failed', {
            stage: 'profile_fetch',
            errorName: 'Error',
            errorCode: 'ERR_NETWORK',
            errorMessage: 'Network Error',
            httpStatus: 503,
        });
        expect(JSON.stringify(logSpy.mock.calls)).not.toContain(
            'secret-api-key',
        );
        expect(JSON.stringify(logSpy.mock.calls)).not.toContain(
            'secret-payload',
        );
        logSpy.mockRestore();
    });
});
