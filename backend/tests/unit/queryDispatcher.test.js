const teamCollaborationService = require('../../services/teamCollaborationService');
const avatarService = require('../../services/avatarService');
const queryDispatcher = require('../../services/queryDispatcher');

jest.mock('../../services/teamCollaborationService', () => ({
  orchestrateCollaboration: jest.fn(),
  singleAvatarResponse: jest.fn()
}));

jest.mock('../../services/avatarService', () => ({
  getResponse: jest.fn()
}));

describe('queryDispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses singleAvatarResponse when one avatar is active', async () => {
    const avatar = { id: 'a1', name: 'Alpha' };
    teamCollaborationService.singleAvatarResponse.mockResolvedValue({
      responses: [{ avatarId: 'a1', response: 'single' }]
    });

    const result = await queryDispatcher.dispatch({
      message: 'Hello',
      activeAvatars: [avatar],
      chatHistory: [],
      selectedFiles: []
    });

    expect(teamCollaborationService.singleAvatarResponse).toHaveBeenCalledWith(
      'Hello',
      avatar,
      [],
      undefined,
      [],
      []
    );
    expect(teamCollaborationService.orchestrateCollaboration).not.toHaveBeenCalled();
    expect(result.responses[0].response).toBe('single');
  });

  test('uses direct avatar response when avatarId is provided', async () => {
    avatarService.getResponse.mockResolvedValue({
      responses: [{ avatarId: 'a1', response: 'direct' }]
    });

    const result = await queryDispatcher.dispatch({
      message: 'Ping',
      avatarId: 'a1',
      activeAvatars: [{ id: 'a1', name: 'Alpha' }]
    });

    expect(avatarService.getResponse).toHaveBeenCalled();
    expect(teamCollaborationService.singleAvatarResponse).not.toHaveBeenCalled();
    expect(result.responses[0].response).toBe('direct');
  });
});
