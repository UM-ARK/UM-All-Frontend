import {
    requestSchedulingWithAuth,
    requestSchedulingWithVerifiedSession,
} from './scheduling/schedulingApi';

export function putCurrentPushEndpoint(payload, verifiedSession = null) {
    const config = {
        method: 'put',
        url: '/push/endpoints/current',
        data: payload,
    };
    return verifiedSession
        ? requestSchedulingWithVerifiedSession(config, verifiedSession)
        : requestSchedulingWithAuth(config);
}

export function deleteCurrentHarborPushBinding(
    installationId,
    verifiedSession = null,
) {
    const config = {
        method: 'delete',
        url: '/push/harbor/bindings/current',
        data: {installationId},
    };
    return verifiedSession
        ? requestSchedulingWithVerifiedSession(config, verifiedSession)
        : requestSchedulingWithAuth(config);
}
