import { Meteor } from 'meteor/meteor';

import { hasAtLeastOnePermission } from '../../../app/authorization/client';
import { settings } from '../../../app/settings/client';
import { MessageAction } from '../../../app/ui-utils/client';
import { sdk } from '../../../app/utils/client/lib/SDKClient';
import { imperativeModal } from '../../lib/imperativeModal';
import { queryClient } from '../../lib/queryClient';
import { roomCoordinator } from '../../lib/rooms/roomCoordinator';
import { dispatchToastMessage } from '../../lib/toast';
import PinMessageModal from '../../views/room/modals/PinMessageModal';

Meteor.startup(() => {
	MessageAction.addButton({
		id: 'pin-message',
		icon: 'pin',
		label: 'Pin',
		type: 'interaction',
		context: ['pinned', 'message', 'message-mobile', 'threads', 'direct', 'videoconf', 'videoconf-threads'],
		async action(_, { message }) {
			const onConfirm = async () => {
				message.pinned = true;
				try {
					await sdk.call('pinMessage', message);
					queryClient.invalidateQueries(['rooms', message.rid, 'pinned-messages']);
				} catch (error) {
					dispatchToastMessage({ type: 'error', message: error });
				}
				imperativeModal.close();
			};

			imperativeModal.open({
				component: PinMessageModal,
				props: {
					message,
					onConfirm,
					onCancel: () => imperativeModal.close(),
				},
			});
		},
		condition({ message, subscription, room }) {
			if (!settings.get('Message_AllowPinning') || message.pinned || !subscription) {
				return false;
			}
			const isLivechatRoom = roomCoordinator.isLivechatRoom(room.t);
			if (isLivechatRoom) {
				return false;
			}
			return hasAtLeastOnePermission('pin-message', message.rid);
		},
		order: 2,
		group: 'menu',
	});
});
