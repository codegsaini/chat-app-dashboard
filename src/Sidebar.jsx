import css from './sidebar.module.css';
export const Sidebar = ({
	ticketList,
	onChatSelected,
	currentTicketId,
	className,
	latestMessageBuffer,
}) => {
	return (
		<div className={[css.container, className].join(' ')}>
			{true ? (
				ticketList.map((ticketInfo, index) => (
					<ChatItem
						key={index}
						latestMessage={latestMessageBuffer[ticketInfo?.ticket?.id]}
						onChatClick={() => onChatSelected(ticketInfo?.ticket.id)}
						ticketInfo={ticketInfo}
						isActive={ticketInfo?.ticket.id === currentTicketId}
					/>
				))
			) : (
				<p className={css.no_chat_placeholder}>No Ticket</p>
			)}
		</div>
	);
};

const ChatItem = ({ latestMessage, onChatClick, ticketInfo, isActive }) => {
	return (
		<div
			style={{ backgroundColor: isActive ? '#e2e2e2' : '#ffffff' }}
			onClick={onChatClick}
			className={css.chat_item}
		>
			<img
				src={
					'https://static-00.iconduck.com/assets.00/profile-default-icon-1024x1023-4u5mrj2v.png'
				}
				alt={'Profile pic'}
			/>
			<div className={css.chat_content}>
				<p className={css.username}>{ticketInfo?.user?.name}</p>
				<p className={css.chat_text}>{latestMessage || ''}</p>
				<p className={css.chat_page_title}>{ticketInfo?.page}</p>
			</div>
		</div>
	);
};
