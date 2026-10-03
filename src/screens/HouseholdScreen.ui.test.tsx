import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { APIClient } from '../api/client';
import { LocalizationProvider } from '../LocalizationProvider';
import { ThemeProvider } from '../ThemeProvider';
import { HouseholdScreen } from './HouseholdScreen';

jest.mock('../api/client');

const mockedAPIClient = APIClient as jest.MockedClass<typeof APIClient>;

describe('HouseholdScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockedAPIClient.prototype.getHouseholdStatus.mockResolvedValue({ household: null, applications: [] });
    mockedAPIClient.prototype.applyToHousehold.mockResolvedValue({ household: null, applications: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderScreen = () =>
    render(
      <ThemeProvider>
        <LocalizationProvider>
          <HouseholdScreen accessToken="session-token" />
        </LocalizationProvider>
      </ThemeProvider>,
    );

  it('renders the join and create actions after loading', async () => {
    const screen = await renderScreen();

    await waitFor(() => expect(screen.getByText('Find a household')).toBeTruthy());
    expect(screen.getByText('Create household')).toBeTruthy();
  });

  it('submits a parsed invite token', async () => {
    const screen = await renderScreen();

    await waitFor(() => expect(screen.getByPlaceholderText('Invite link or code')).toBeTruthy());
    await fireEvent.changeText(screen.getByPlaceholderText('Invite link or code'), 'invite-token');
    await fireEvent.press(screen.getByText('Apply to household'));

    await waitFor(() => expect(mockedAPIClient.prototype.applyToHousehold).toHaveBeenCalledWith('session-token', 'invite-token'));
  });

  it('shows disband confirmation to the final household member', async () => {
    mockedAPIClient.prototype.getHouseholdStatus.mockResolvedValueOnce({
      household: { id: 'household-1', name: 'Ada Household', members: [{ id: 'user-1', displayName: 'Ada' }] },
      applications: [],
    });
    const screen = await renderScreen();

    await waitFor(() => expect(screen.getByText('Disband household')).toBeTruthy());
    await fireEvent.press(screen.getByText('Disband household'));

    expect(screen.getByText('The shared data moves to your personal account and the household is removed. This cannot be undone.')).toBeTruthy();
  });
});
