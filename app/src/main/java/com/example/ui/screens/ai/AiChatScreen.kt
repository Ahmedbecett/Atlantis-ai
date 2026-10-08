package com.example.ui.screens.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

data class AndroidAiMessage(
    val id: String,
    val role: String, // "user" or "assistant"
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isThinking: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiChatScreen(
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val clipboardManager = LocalClipboardManager.current

    var inputText by remember { mutableStateOf("") }
    var isThinkingMode by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var creditsLeft by remember { mutableIntStateOf(15) }

    val messages = remember {
        mutableStateListOf(
            AndroidAiMessage(
                id = "welcome",
                role = "assistant",
                content = "Welcome to Atlantis AI. Ask me anything, generate software code, analyze data, or explore complex reasoning."
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Atlantis AI",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(Color(0xFF00F2FE).copy(alpha = 0.2f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "Flash 3.8",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF00F2FE)
                                )
                            }
                        }
                        Text(
                            text = "$creditsLeft credits remaining today",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        messages.clear()
                        messages.add(
                            AndroidAiMessage(
                                id = "welcome-${System.currentTimeMillis()}",
                                role = "assistant",
                                content = "Conversation cleared. How can I help you today?"
                            )
                        )
                    }) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Clear Chat",
                            tint = Color(0xFF94A3B8)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF050B18)
                )
            )
        },
        containerColor = Color(0xFF030712)
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Messages List
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(vertical = 16.dp)
            ) {
                items(messages, key = { it.id }) { msg ->
                    val isUser = msg.role == "user"
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                    ) {
                        if (!isUser) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.linearGradient(
                                            listOf(Color(0xFF00F2FE), Color(0xFF2563EB))
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "Ψ",
                                    color = Color.White,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                        }

                        Column(
                            modifier = Modifier.weight(1f, fill = false)
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(
                                        RoundedCornerShape(
                                            topStart = 16.dp,
                                            topEnd = 16.dp,
                                            bottomStart = if (isUser) 16.dp else 2.dp,
                                            bottomEnd = if (isUser) 2.dp else 16.dp
                                        )
                                    )
                                    .background(
                                        if (isUser) {
                                            Brush.horizontalGradient(
                                                listOf(Color(0xFF1D4ED8), Color(0xFF0284C7))
                                            )
                                        } else {
                                            Brush.linearGradient(
                                                listOf(Color(0xFF0A1224), Color(0xFF060D1A))
                                            )
                                        }
                                    )
                                    .padding(14.dp)
                            ) {
                                Column {
                                    if (!isUser && msg.isThinking) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(bottom = 6.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Psychology,
                                                contentDescription = "Reasoning",
                                                tint = Color(0xFF00F2FE),
                                                modifier = Modifier.size(14.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Deep Reasoner Applied",
                                                color = Color(0xFF00F2FE),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    Text(
                                        text = msg.content,
                                        color = if (isUser) Color.White else Color(0xFFE2E8F0),
                                        fontSize = 14.sp,
                                        lineHeight = 20.sp,
                                        fontFamily = if (msg.content.contains("class ") || msg.content.contains("function ")) FontFamily.Monospace else FontFamily.Default
                                    )
                                }
                            }

                            if (!isUser) {
                                Row(
                                    modifier = Modifier.padding(top = 4.dp, start = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Copy",
                                        color = Color(0xFF64748B),
                                        fontSize = 11.sp,
                                        modifier = Modifier.clickable {
                                            clipboardManager.setText(AnnotatedString(msg.content))
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                if (isLoading) {
                    item {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(start = 40.dp)
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color(0xFF00F2FE),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Atlantis is thinking...",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            // Controls & Input Bar
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF050B18))
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                // Feature switches
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FilterChip(
                        selected = isThinkingMode,
                        onClick = { isThinkingMode = !isThinkingMode },
                        label = { Text("Deep Reasoning", fontSize = 11.sp) },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Psychology,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Color(0xFF00F2FE).copy(alpha = 0.2f),
                            selectedLabelColor = Color(0xFF00F2FE)
                        )
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Input Box
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = {
                            Text(
                                text = "Ask Atlantis AI anything...",
                                color = Color(0xFF64748B),
                                fontSize = 13.sp
                            )
                        },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(20.dp)),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color(0xFF0B1428),
                            unfocusedContainerColor = Color(0xFF0B1428),
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        maxLines = 4
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    IconButton(
                        onClick = {
                            val promptToSend = inputText.trim()
                            if (promptToSend.isNotBlank() && !isLoading) {
                                inputText = ""
                                messages.add(
                                    AndroidAiMessage(
                                        id = "u-${System.currentTimeMillis()}",
                                        role = "user",
                                        content = promptToSend
                                    )
                                )
                                isLoading = true

                                scope.launch {
                                    listState.animateScrollToItem(messages.size - 1)
                                    // Send to backend API
                                    try {
                                        val req = com.example.data.remote.AiChatApiRequest(
                                            prompt = promptToSend,
                                            isDeepThinking = isThinkingMode
                                        )
                                        val response = com.example.data.remote.ZevoraApiClient.api.sendAiChat(req)
                                        if (response.isSuccessful && response.body() != null) {
                                            val body = response.body()!!
                                            messages.add(
                                                AndroidAiMessage(
                                                    id = "a-${System.currentTimeMillis()}",
                                                    role = "assistant",
                                                    content = body.text,
                                                    isThinking = isThinkingMode
                                                )
                                            )
                                            body.creditsLeft?.let { creditsLeft = it }
                                        } else {
                                            messages.add(
                                                AndroidAiMessage(
                                                    id = "err-${System.currentTimeMillis()}",
                                                    role = "assistant",
                                                    content = "Error: Unable to connect to Atlantis AI backend server."
                                                )
                                            )
                                        }
                                    } catch (e: Exception) {
                                        messages.add(
                                            AndroidAiMessage(
                                                id = "err-${System.currentTimeMillis()}",
                                                role = "assistant",
                                                content = "Error: ${e.message ?: "Network failure"}"
                                            )
                                        )
                                    } finally {
                                        isLoading = false
                                        listState.animateScrollToItem(messages.size - 1)
                                    }
                                }
                            }
                        },
                        enabled = inputText.isNotBlank() && !isLoading,
                        modifier = Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(
                                if (inputText.isNotBlank()) Color(0xFF00F2FE) else Color(0xFF1E293B)
                            )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Send,
                            contentDescription = "Send",
                            tint = if (inputText.isNotBlank()) Color(0xFF030712) else Color(0xFF64748B),
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
    }
}
