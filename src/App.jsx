import { useEffect, useRef, useState } from 'react';
import css from './app.module.css';
import { Sidebar } from './Sidebar';
import axios from 'axios';
import io from 'socket.io-client';

function App() {
	const endMessageRef = useRef(null);
	const [socket, setSocket] = useState(null);
	const [messages, setMessages] = useState([]);
	const [reply, setReply] = useState('');
	const [currentTicketInfo, setCurrentTicketInfo] = useState(null);
	const [ticketList, setTicketList] = useState([]);
	const [loading, setLoading] = useState(false);
	const [connectedToChat, setConnectedToSocketChat] = useState(false);
	const [resolved, setResolved] = useState(false);
	const [latestMessageBuffer, setLatestMessageBuffer] = useState([]);

	useEffect(() => {
		getTicketList();
	}, []);

	useEffect(() => {
		connectToSocket();
	}, []);

	useEffect(() => {
		if (currentTicketInfo && socket) {
			socket?.emit('connectChat', {
				ticketId: currentTicketInfo?.ticket?.id,
			});
			getOlderMessages();
		}
	}, [currentTicketInfo, socket]);

	useEffect(() => {
		socket?.on('connected', async () => {
			setConnectedToSocketChat(true);
		});
		socket?.on('error', async (data) => {
			console.log(data);
		});
		socket?.on('resolved', async (data) => {
			setResolved(true);
		});
		socket?.on('reply', async (data) => {
			onMessageReceive(data);
		});
		socket?.on('newChat', async (data) => {
			onNewTicketReceive(data);
		});
		return () => {
			socket?.off('connected');
			socket?.off('error');
			socket?.off('resolved');
			socket?.off('reply');
			socket?.off('newChat');
		};
	}, [socket, connectedToChat]);

	const onNewTicketReceive = (data) => {
		socket?.emit('connectChat', {
			ticketId: data?.ticket?.id,
		});
		setLatestMessageBuffer((prev) => ({
			...prev,
			[data?.ticket?.id]: data.lastMessage,
		}));
		setTicketList((prev) => [...prev, data]);
	};

	const onMessageReceive = (data) => {
		setLatestMessageBuffer((prev) => ({
			...prev,
			[data.ticketId]: data.message,
		}));
		if (data.ticketId === currentTicketInfo?.ticket?.id)
			setMessages((prev) => [...prev, data]);
		// const oldTicketLst = ticketList?.map((ticketInfo) => {
		// 	if (ticketInfo.ticket.id == currentTicketInfo?.ticket?.id) {
		// 		const info = ticketInfo;
		// 		info['lastMessage'] = data.message;
		// 		return info;
		// 	}
		// 	return ticketInfo;
		// });
		//setTicketList(oldTicketLst);
	};

	const emitChat = (message) => {
		const data = {
			uid: 'org1',
			receiverId: currentTicketInfo?.user?.id,
			ticketId: currentTicketInfo?.ticket?.id,
			reply: message,
		};
		socket?.emit('chat', data);
	};
	const onMessageSend = async (message) => {
		emitChat(message);
	};

	const connectToSocket = async () => {
		try {
			setLoading(true);
			const socketIo = io('http://localhost:8080', {
				transports: ['websocket'],
			});
			setSocket(socketIo);
			socketIo?.emit('joinOrg', { orgId: 'org1' });
		} catch (e) {
			console.log(e);
		} finally {
			if (loading) setLoading(false);
		}
	};

	const getTicketList = async () => {
		try {
			const response = await axios.post(
				'http://localhost:8080/api/v1/ticket/list',
				{ orgId: 'org1' }
			);
			if (!response) return console.log('Something went wrong');
			setTicketList(response.data);
			response.data?.forEach((ticketInfo) => {
				setLatestMessageBuffer((prev) => ({
					...prev,
					[ticketInfo?.ticket?.id]: ticketInfo?.lastMessage,
				}));
			});
		} catch (e) {
			console.log(e);
		}
	};

	const getOlderMessages = async () => {
		try {
			const response = await axios.post(
				'http://localhost:8080/api/v1/chat/list',
				{ ticketId: currentTicketInfo?.ticket?.id }
			);
			if (!response) return console.log('Something went wrong');
			setLatestMessageBuffer((prev) => ({
				...prev,
				[response.data[response.data.length - 1].ticketId]:
					response.data[response.data.length - 1].message,
			}));
			setMessages(response.data);
		} catch (e) {
			console.log(e);
		}
	};

	const sendMessage = () => {
		onMessageSend(reply);
		setReply('');
	};

	const handleKeyDown = (e) => {
		if (e.key == 'Enter') {
			sendMessage();
		}
	};

	useEffect(() => {
		endMessageRef?.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleTicketSelected = (id) => {
		const ticketInfo = ticketList.find(
			(ticketInfo) => ticketInfo.ticket.id === id
		);
		if (!ticketInfo) return;
		setCurrentTicketInfo(ticketInfo);
		const isResolved = ticketInfo.ticket.resolved;
		setResolved(isResolved);
	};
	const onResolve = () => {
		socket?.emit('resolve', { ticketId: currentTicketInfo?.ticket?.id });
	};
	return (
		<div className={css.container}>
			<Sidebar
				ticketList={ticketList.slice(0).reverse()}
				onChatSelected={(id) => handleTicketSelected(id)}
				currentTicketId={currentTicketInfo?.ticket?.id}
				className={css.sidebar_container}
				latestMessageBuffer={latestMessageBuffer}
			/>
			{currentTicketInfo ? (
				<div className={css.content_container}>
					<div className={css.topbar}>
						<p>{currentTicketInfo?.user?.name}</p>
						{!resolved && <button onClick={onResolve}>Resolve</button>}
					</div>
					<div className={css.chat_container}>
						{messages.map((chat, index) =>
							chat.senderId === 'org1' ? (
								<ChatItemMe
									key={index}
									index={index}
									chat={chat}
								/>
							) : (
								<ChatItem
									key={index}
									index={index}
									chat={chat}
								/>
							)
						)}
						<div
							ref={endMessageRef}
							className={css.dummy_end_message}
						></div>
						{resolved && (
							<p className={css.resolved_message}>Ticket Resolved</p>
						)}
					</div>
					{!resolved && (
						<div className={css.reply_input_container}>
							<input
								onKeyDown={handleKeyDown}
								value={reply}
								onChange={(e) => setReply(e.target.value)}
								type={'text'}
								placeholder={'Reply here...'}
							/>
						</div>
					)}
				</div>
			) : (
				<p>Select chat</p>
			)}
		</div>
	);
}

const ChatItem = ({ chat }) => {
	return (
		<div className={css.chat_item}>
			<img
				src={
					'https://static-00.iconduck.com/assets.00/profile-default-icon-1024x1023-4u5mrj2v.png'
				}
				alt={'Profile pic'}
			/>
			<div className={css.message_container}>
				<p className={css.username}>Gaurav</p>
				<p className={css.message_text}>{chat?.message}</p>
			</div>
		</div>
	);
};
const ChatItemMe = ({ chat }) => {
	return (
		<div className={[css.chat_item, css.chat_item_me].join(' ')}>
			<div className={css.message_container}>
				<p className={css.message_text}>{chat?.message}</p>
			</div>
		</div>
	);
};
export default App;
