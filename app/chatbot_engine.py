"""
AI Chatbot Engine for Financial Crime Detection
Answers user queries using uploaded dataset and fraud detection results.
"""
import re
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class FraudChatBot:
    """
    Context-aware chatbot that answers questions about uploaded transaction
    data, graph analysis, and fraud detection results.
    """

    def __init__(self):
        self.dataset_summary: Optional[Dict] = None
        self.graph_summary: Optional[Dict] = None
        self.fraud_results: Optional[Dict] = None
        self.formatted_results: Optional[Dict] = None
        self.risk_intelligence: Optional[Dict] = None
        self.transactions_df = None
        self.node_metrics: Optional[List[Dict]] = None
        self.edge_data: Optional[List[Dict]] = None

    # ── Context loaders ──────────────────────────────────────────────────
    def set_dataset_summary(self, summary: Dict):
        self.dataset_summary = summary

    def set_graph_data(self, nodes: List[Dict], edges: List[Dict], summary: Dict):
        self.node_metrics = nodes
        self.edge_data = edges
        self.graph_summary = summary

    def set_fraud_results(self, results: Dict):
        self.fraud_results = results

    def set_formatted_results(self, results: Dict):
        self.formatted_results = results

    def set_risk_intelligence(self, data: Dict):
        self.risk_intelligence = data

    def set_transactions_df(self, df):
        self.transactions_df = df

    # ── Main query handler ───────────────────────────────────────────────
    def answer(self, question: str) -> Dict[str, Any]:
        """
        Process a user question and return an answer based on available data.
        """
        q = question.lower().strip()
        logger.info(f"ChatBot query: {q}")

        if not self.dataset_summary and not self.fraud_results:
            return self._reply(
                "No data has been uploaded yet. Please upload a CSV file first, "
                "then run fraud detection so I can answer your questions.",
                "no_data"
            )

        # Route to the best handler
        try:
            # Greetings
            if re.search(r'\b(hello|hi|hey|greetings)\b', q):
                return self._handle_greeting()

            # Help / capabilities
            if re.search(r'\b(help|what can you|capabilities|commands)\b', q):
                return self._handle_help()

            # Specific account lookup
            acc_match = re.search(r'\b(acc[_\-]?\d+)\b', q, re.IGNORECASE)
            if acc_match:
                return self._handle_account_lookup(acc_match.group(1).upper().replace('-', '_'))

            # Specific ring lookup
            ring_match = re.search(r'\b(ring[_\-]?\d+)\b', q, re.IGNORECASE)
            if ring_match:
                return self._handle_ring_lookup(ring_match.group(1).upper().replace('-', '_'))

            # Dataset / upload questions
            if re.search(r'(dataset|upload|csv|data\s*set|how many transaction|total transaction|transaction count)', q):
                return self._handle_dataset_info()

            # Account questions
            if re.search(r'(how many account|total account|number of account|unique account|account count)', q):
                return self._handle_account_count()

            # Fraud ring questions
            if re.search(r'(how many ring|number of ring|fraud ring|ring count|total ring|rings detected|detected ring)', q):
                return self._handle_ring_summary()

            # Suspicious accounts
            if re.search(r'(suspicious|flagged|risky|high risk|most suspicious|top suspicious|riskiest)', q):
                return self._handle_suspicious_accounts()

            # Pattern questions
            if re.search(r'(pattern|cycle|fan.?in|fan.?out|shell|smurfing|money muling|laundering)', q):
                return self._handle_pattern_info()

            # Risk score questions
            if re.search(r'(risk score|score|highest score|average score|risk level)', q):
                return self._handle_risk_scores()

            # Graph/network questions
            if re.search(r'(graph|network|node|edge|connection|degree|density|connected)', q):
                return self._handle_graph_info()

            # Summary / overview
            if re.search(r'(summary|overview|report|tell me about|what did you find|results|analysis|findings|conclusion)', q):
                return self._handle_full_summary()

            # Amount / volume questions
            if re.search(r'(amount|volume|money|total amount|highest amount|largest|transaction value)', q):
                return self._handle_amount_info()

            # Date / time questions
            if re.search(r'(date|time|when|period|range|earliest|latest|first|last)', q):
                return self._handle_date_info()

            # Top / highest / most
            if re.search(r'(top|highest|most|biggest|largest|worst)', q):
                return self._handle_top_entities()

            # Count questions (generic)
            if re.search(r'(how many|count|number of|total)', q):
                return self._handle_generic_count(q)

            # Fallback: try to give a useful summary
            return self._handle_fallback(question)

        except Exception as e:
            logger.error(f"ChatBot error: {e}", exc_info=True)
            return self._reply(
                f"I encountered an issue processing your question. Please try rephrasing. Error: {str(e)}",
                "error"
            )

    # ── Handlers ─────────────────────────────────────────────────────────

    def _handle_greeting(self):
        status_parts = []
        if self.dataset_summary:
            status_parts.append("dataset uploaded")
        if self.fraud_results:
            status_parts.append("fraud detection complete")
        status = " and ".join(status_parts) if status_parts else "waiting for data"
        return self._reply(
            f"Hello! I'm your Fraud Detection AI Assistant. Current status: {status}. "
            "Ask me anything about the uploaded transactions, detected fraud rings, "
            "suspicious accounts, risk scores, or the transaction network graph!",
            "greeting"
        )

    def _handle_help(self):
        return self._reply(
            "Here's what you can ask me:\n\n"
            "📊 **Dataset Info** — \"How many transactions?\" \"Tell me about the dataset\"\n"
            "👤 **Account Lookup** — \"Tell me about ACC_00123\" \"Is ACC401 suspicious?\"\n"
            "🔄 **Fraud Rings** — \"How many rings detected?\" \"Show me RING_001\"\n"
            "⚠️ **Suspicious Accounts** — \"List suspicious accounts\" \"Top 5 riskiest\"\n"
            "🔍 **Patterns** — \"What patterns were found?\" \"Any cycles detected?\"\n"
            "📈 **Risk Scores** — \"What's the highest risk score?\" \"Average risk score\"\n"
            "🌐 **Graph Info** — \"How many nodes?\" \"Graph density?\" \"Connections\"\n"
            "💰 **Amounts** — \"Largest transaction?\" \"Total volume?\"\n"
            "📋 **Summary** — \"Give me an overview\" \"Summarize findings\"\n",
            "help"
        )

    def _handle_dataset_info(self):
        parts = []
        if self.dataset_summary:
            ds = self.dataset_summary
            parts.append(f"📊 **Dataset Overview:**")
            parts.append(f"• Total transactions: **{ds.get('total_transactions', 'N/A'):,}**")
            parts.append(f"• Unique accounts: **{ds.get('unique_accounts', 'N/A')}**")
            dr = ds.get('date_range', {})
            if dr:
                parts.append(f"• Date range: **{dr.get('start', '?')}** to **{dr.get('end', '?')}**")
        else:
            parts.append("No dataset has been uploaded yet.")

        if self.graph_summary:
            gs = self.graph_summary
            parts.append(f"\n🌐 **Graph Stats:**")
            parts.append(f"• Nodes (accounts): **{gs.get('total_nodes', 0)}**")
            parts.append(f"• Edges (flows): **{gs.get('total_edges', 0)}**")
            parts.append(f"• Graph density: **{gs.get('density', 0):.4f}**")

        return self._reply("\n".join(parts), "dataset")

    def _handle_account_count(self):
        count = None
        if self.graph_summary:
            count = self.graph_summary.get('total_nodes', 0)
        elif self.dataset_summary:
            count = self.dataset_summary.get('unique_accounts', 0)

        if count is not None:
            return self._reply(
                f"There are **{count}** unique accounts in the dataset.",
                "count"
            )
        return self._reply("No data available. Please upload a CSV file first.", "no_data")

    def _handle_ring_summary(self):
        if not self.fraud_results:
            return self._reply(
                "Fraud detection hasn't been run yet. Click 'Run Fraud Detection' first!",
                "no_detection"
            )

        rings = self.fraud_results.get('fraud_rings', [])
        if not rings:
            return self._reply("No fraud rings were detected in the dataset. ✅", "rings")

        # Group by pattern type
        pattern_counts = {}
        for r in rings:
            pt = r.get('pattern_type', 'unknown')
            pattern_counts[pt] = pattern_counts.get(pt, 0) + 1

        parts = [f"🔄 **{len(rings)} fraud ring(s) detected:**\n"]
        for pt, ct in sorted(pattern_counts.items(), key=lambda x: -x[1]):
            icon = {'cycle': '🔄', 'fan_in': '📥', 'fan_out': '📤', 'shell_chain': '🔗'}.get(pt, '⚠️')
            parts.append(f"• {icon} **{pt.replace('_', ' ').title()}**: {ct} ring(s)")

        highest = max(rings, key=lambda r: r.get('risk_score', 0))
        parts.append(f"\n🚨 Highest risk ring: **{highest.get('ring_id')}** "
                     f"(score: **{highest.get('risk_score', 0):.1f}**, "
                     f"{highest.get('member_count', 0)} members)")

        total_members = set()
        for r in rings:
            for m in r.get('member_accounts', []):
                total_members.add(m)
        parts.append(f"\n👥 Total unique accounts in rings: **{len(total_members)}**")

        return self._reply("\n".join(parts), "rings")

    def _handle_suspicious_accounts(self):
        if not self.fraud_results:
            return self._reply(
                "Fraud detection hasn't been run yet. Please run it first!",
                "no_detection"
            )

        accounts = self.fraud_results.get('suspicious_accounts', [])
        if not accounts:
            return self._reply("No suspicious accounts found. All accounts appear clean! ✅", "suspicious")

        # Sort by score desc
        accounts_sorted = sorted(accounts, key=lambda a: a.get('score', a.get('suspicion_score', 0)), reverse=True)

        parts = [f"⚠️ **{len(accounts_sorted)} suspicious account(s) flagged:**\n"]

        # Show top 10
        for i, acc in enumerate(accounts_sorted[:10]):
            score = acc.get('score', acc.get('suspicion_score', 0))
            level = acc.get('risk_level', 'UNKNOWN')
            patterns = acc.get('patterns', acc.get('detected_patterns', []))
            emoji = '🔴' if score >= 70 else '🟠' if score >= 40 else '🟡'
            parts.append(
                f"{emoji} **{acc.get('account_id')}** — Score: **{score:.1f}** ({level}) "
                f"| Patterns: {', '.join(patterns) if patterns else 'none'}"
            )

        if len(accounts_sorted) > 10:
            parts.append(f"\n... and **{len(accounts_sorted) - 10}** more.")

        return self._reply("\n".join(parts), "suspicious")

    def _handle_pattern_info(self):
        if not self.fraud_results:
            return self._reply(
                "Run fraud detection first to see pattern analysis!",
                "no_detection"
            )

        det = self.fraud_results.get('detection_summary', {})
        parts = ["🔍 **Pattern Detection Results:**\n"]
        parts.append(f"• 🔄 Circular routing (cycles): **{det.get('cycles_detected', 0)}**")
        parts.append(f"• 📥 Fan-in patterns: **{det.get('fanin_detected', 0)}**")
        parts.append(f"• 📤 Fan-out patterns: **{det.get('fanout_detected', 0)}**")
        parts.append(f"• 🔗 Shell chains: **{det.get('chains_detected', 0)}**")
        parts.append(f"\n📋 Total rings: **{det.get('total_rings', 0)}**")
        parts.append(f"• 🔴 High risk accounts: **{det.get('high_risk_accounts', 0)}**")
        parts.append(f"• 🟠 Medium risk accounts: **{det.get('medium_risk_accounts', 0)}**")

        return self._reply("\n".join(parts), "patterns")

    def _handle_risk_scores(self):
        if not self.fraud_results:
            return self._reply("Run fraud detection first!", "no_detection")

        accounts = self.fraud_results.get('suspicious_accounts', [])
        if not accounts:
            return self._reply("No risk scores available — no suspicious accounts found.", "scores")

        scores = [a.get('score', a.get('suspicion_score', 0)) for a in accounts]
        avg = sum(scores) / len(scores)
        mx = max(scores)
        mn = min(scores)

        top_acc = max(accounts, key=lambda a: a.get('score', a.get('suspicion_score', 0)))

        parts = [
            "📈 **Risk Score Analysis:**\n",
            f"• Highest score: **{mx:.1f}** ({top_acc.get('account_id')})",
            f"• Lowest score: **{mn:.1f}**",
            f"• Average score: **{avg:.1f}**",
            f"• Total flagged: **{len(accounts)}**",
        ]

        # Distribution
        high = sum(1 for s in scores if s >= 70)
        med = sum(1 for s in scores if 40 <= s < 70)
        low = sum(1 for s in scores if s < 40)
        parts.append(f"\n📊 **Distribution:** 🔴 High: {high} | 🟠 Medium: {med} | 🟡 Low: {low}")

        return self._reply("\n".join(parts), "scores")

    def _handle_graph_info(self):
        if not self.graph_summary:
            return self._reply(
                "No graph data available. Upload a CSV file first!",
                "no_data"
            )

        gs = self.graph_summary
        parts = [
            "🌐 **Transaction Network Graph:**\n",
            f"• Total nodes (accounts): **{gs.get('total_nodes', 0)}**",
            f"• Total edges (transaction flows): **{gs.get('total_edges', 0)}**",
            f"• Graph density: **{gs.get('density', 0):.4f}**",
            f"• Weakly connected: **{'Yes' if gs.get('is_connected') else 'No'}**",
        ]

        if self.node_metrics:
            in_degrees = [n.get('in_degree', 0) for n in self.node_metrics]
            out_degrees = [n.get('out_degree', 0) for n in self.node_metrics]
            max_in = max(in_degrees) if in_degrees else 0
            max_out = max(out_degrees) if out_degrees else 0
            avg_degree = (sum(in_degrees) + sum(out_degrees)) / max(len(self.node_metrics), 1)

            hub_node_in = next((n for n in self.node_metrics if n.get('in_degree') == max_in), None)
            hub_node_out = next((n for n in self.node_metrics if n.get('out_degree') == max_out), None)

            parts.append(f"\n📊 **Degree Statistics:**")
            parts.append(f"• Avg degree: **{avg_degree:.1f}**")
            parts.append(f"• Max in-degree: **{max_in}** ({hub_node_in['id'] if hub_node_in else '?'})")
            parts.append(f"• Max out-degree: **{max_out}** ({hub_node_out['id'] if hub_node_out else '?'})")

        return self._reply("\n".join(parts), "graph")

    def _handle_account_lookup(self, account_id: str):
        parts = [f"👤 **Account: {account_id}**\n"]
        found = False

        # Node metrics
        if self.node_metrics:
            node = next((n for n in self.node_metrics if n['id'].upper() == account_id.upper()), None)
            if node:
                found = True
                parts.append(f"📊 **Transaction Metrics:**")
                parts.append(f"• In-degree: **{node.get('in_degree', 0)}**")
                parts.append(f"• Out-degree: **{node.get('out_degree', 0)}**")
                parts.append(f"• Total transactions: **{node.get('total_transactions', 0)}**")
                parts.append(f"• Amount sent: **${node.get('total_amount_sent', 0):,.2f}**")
                parts.append(f"• Amount received: **${node.get('total_amount_received', 0):,.2f}**")
                parts.append(f"• Net flow: **${node.get('net_flow', 0):,.2f}**")

        # Suspicious status
        if self.fraud_results:
            sus = next(
                (a for a in self.fraud_results.get('suspicious_accounts', [])
                 if a.get('account_id', '').upper() == account_id.upper()),
                None
            )
            if sus:
                found = True
                score = sus.get('score', sus.get('suspicion_score', 0))
                patterns = sus.get('patterns', sus.get('detected_patterns', []))
                parts.append(f"\n⚠️ **Flagged as Suspicious!**")
                parts.append(f"• Risk score: **{score:.1f}**")
                parts.append(f"• Risk level: **{sus.get('risk_level', 'N/A')}**")
                parts.append(f"• Patterns: {', '.join(patterns) if patterns else 'none'}")
            else:
                parts.append(f"\n✅ Not flagged as suspicious.")

        # Ring membership
        if self.fraud_results:
            for ring in self.fraud_results.get('fraud_rings', []):
                members_upper = [m.upper() for m in ring.get('member_accounts', [])]
                if account_id.upper() in members_upper:
                    found = True
                    parts.append(f"\n🔄 **Member of {ring.get('ring_id')}:**")
                    parts.append(f"• Pattern: {ring.get('pattern_type', 'unknown')}")
                    parts.append(f"• Ring risk: {ring.get('risk_score', 0):.1f}")
                    parts.append(f"• Other members: {', '.join(m for m in ring.get('member_accounts', []) if m.upper() != account_id.upper())}")

        if not found:
            return self._reply(
                f"Account **{account_id}** was not found in the dataset. "
                "Please check the account ID and try again.",
                "not_found"
            )

        return self._reply("\n".join(parts), "account")

    def _handle_ring_lookup(self, ring_id: str):
        if not self.fraud_results:
            return self._reply("Run fraud detection first!", "no_detection")

        ring = next(
            (r for r in self.fraud_results.get('fraud_rings', [])
             if r.get('ring_id', '').upper() == ring_id.upper()),
            None
        )

        if not ring:
            return self._reply(
                f"Ring **{ring_id}** was not found. "
                f"Available rings: {', '.join(r.get('ring_id', '') for r in self.fraud_results.get('fraud_rings', [])[:10])}",
                "not_found"
            )

        icon = {'cycle': '🔄', 'fan_in': '📥', 'fan_out': '📤', 'shell_chain': '🔗'}.get(
            ring.get('pattern_type'), '⚠️'
        )

        parts = [
            f"{icon} **{ring.get('ring_id')}** — {ring.get('pattern_type', 'unknown').replace('_', ' ').title()}\n",
            f"• Risk score: **{ring.get('risk_score', 0):.1f}**",
            f"• Member count: **{ring.get('member_count', 0)}**",
            f"• Members: {', '.join(ring.get('member_accounts', []))}",
        ]

        if ring.get('description'):
            parts.append(f"• Description: {ring['description']}")

        return self._reply("\n".join(parts), "ring")

    def _handle_amount_info(self):
        parts = ["💰 **Transaction Volume Analysis:**\n"]

        if self.edge_data:
            amounts = [e.get('amount', 0) for e in self.edge_data]
            total = sum(amounts)
            avg = total / max(len(amounts), 1)
            mx = max(amounts) if amounts else 0
            mn = min(amounts) if amounts else 0

            biggest_edge = max(self.edge_data, key=lambda e: e.get('amount', 0)) if self.edge_data else None

            parts.append(f"• Total volume: **${total:,.2f}**")
            parts.append(f"• Average per flow: **${avg:,.2f}**")
            parts.append(f"• Largest single flow: **${mx:,.2f}**")
            if biggest_edge:
                parts.append(f"  → From **{biggest_edge.get('source')}** to **{biggest_edge.get('target')}**")
            parts.append(f"• Smallest flow: **${mn:,.2f}**")
            parts.append(f"• Total flows: **{len(amounts)}**")
        elif self.dataset_summary:
            parts.append("Detailed amount analysis requires graph data. Upload a CSV to view.")
        else:
            return self._reply("No data available. Upload a CSV file first!", "no_data")

        return self._reply("\n".join(parts), "amounts")

    def _handle_date_info(self):
        if self.dataset_summary:
            dr = self.dataset_summary.get('date_range', {})
            if dr:
                return self._reply(
                    f"📅 **Transaction Date Range:**\n"
                    f"• Start: **{dr.get('start', 'Unknown')}**\n"
                    f"• End: **{dr.get('end', 'Unknown')}**",
                    "dates"
                )
        return self._reply("No date information available. Upload a CSV first!", "no_data")

    def _handle_top_entities(self):
        parts = ["🏆 **Top Entities:**\n"]

        if self.fraud_results:
            accounts = self.fraud_results.get('suspicious_accounts', [])
            if accounts:
                top5 = sorted(accounts,
                              key=lambda a: a.get('score', a.get('suspicion_score', 0)),
                              reverse=True)[:5]
                parts.append("**Top 5 Riskiest Accounts:**")
                for i, acc in enumerate(top5, 1):
                    score = acc.get('score', acc.get('suspicion_score', 0))
                    parts.append(f"  {i}. **{acc.get('account_id')}** — Score: {score:.1f}")

            rings = self.fraud_results.get('fraud_rings', [])
            if rings:
                top_rings = sorted(rings, key=lambda r: r.get('risk_score', 0), reverse=True)[:3]
                parts.append("\n**Top 3 Highest-Risk Rings:**")
                for i, r in enumerate(top_rings, 1):
                    parts.append(
                        f"  {i}. **{r.get('ring_id')}** — Score: {r.get('risk_score', 0):.1f} "
                        f"({r.get('member_count', 0)} members)"
                    )

        if len(parts) == 1:
            parts.append("Run fraud detection first to see top entities!")

        return self._reply("\n".join(parts), "top")

    def _handle_generic_count(self, q: str):
        parts = []
        if self.dataset_summary:
            parts.append(f"• Transactions: **{self.dataset_summary.get('total_transactions', 0):,}**")
            parts.append(f"• Unique accounts: **{self.dataset_summary.get('unique_accounts', 0)}**")
        if self.fraud_results:
            parts.append(f"• Suspicious accounts: **{len(self.fraud_results.get('suspicious_accounts', []))}**")
            parts.append(f"• Fraud rings: **{len(self.fraud_results.get('fraud_rings', []))}**")
        if self.graph_summary:
            parts.append(f"• Graph nodes: **{self.graph_summary.get('total_nodes', 0)}**")
            parts.append(f"• Graph edges: **{self.graph_summary.get('total_edges', 0)}**")

        if parts:
            return self._reply("📊 **Counts Summary:**\n\n" + "\n".join(parts), "count")
        return self._reply("No data available yet. Upload a CSV file!", "no_data")

    def _handle_full_summary(self):
        parts = ["📋 **Full Analysis Summary:**\n"]

        if self.dataset_summary:
            ds = self.dataset_summary
            parts.append(f"📊 **Dataset:** {ds.get('total_transactions', 0):,} transactions across "
                         f"{ds.get('unique_accounts', 0)} accounts")

        if self.graph_summary:
            gs = self.graph_summary
            parts.append(f"🌐 **Network:** {gs.get('total_nodes', 0)} nodes, "
                         f"{gs.get('total_edges', 0)} edges, "
                         f"density {gs.get('density', 0):.4f}")

        if self.fraud_results:
            sus = self.fraud_results.get('suspicious_accounts', [])
            rings = self.fraud_results.get('fraud_rings', [])
            det = self.fraud_results.get('detection_summary', {})

            parts.append(f"\n🔍 **Fraud Detection Results:**")
            parts.append(f"• ⚠️ Suspicious accounts: **{len(sus)}**")
            parts.append(f"• 🔄 Fraud rings: **{len(rings)}**")
            parts.append(f"• Cycles: {det.get('cycles_detected', 0)} | "
                         f"Fan-in: {det.get('fanin_detected', 0)} | "
                         f"Fan-out: {det.get('fanout_detected', 0)} | "
                         f"Shell chains: {det.get('chains_detected', 0)}")

            if sus:
                top = max(sus, key=lambda a: a.get('score', a.get('suspicion_score', 0)))
                top_score = top.get('score', top.get('suspicion_score', 0))
                parts.append(f"\n🚨 **Highest risk:** {top.get('account_id')} (score: {top_score:.1f})")

            if rings:
                parts.append(f"🔴 **Highest risk ring:** "
                             f"{max(rings, key=lambda r: r.get('risk_score', 0)).get('ring_id')}")
        else:
            parts.append("\n⏳ Fraud detection has not been run yet.")

        if self.formatted_results and self.formatted_results.get('summary'):
            s = self.formatted_results['summary']
            parts.append(f"\n⏱️ Processing time: **{s.get('processing_time_seconds', 0):.2f}s**")

        return self._reply("\n".join(parts), "summary")

    def _handle_fallback(self, original_question: str):
        """Try to give something useful when no specific handler matches."""
        # If we have data, give the summary
        if self.fraud_results or self.dataset_summary:
            return self._reply(
                f"I'm not sure how to answer \"{original_question}\" specifically, "
                "but here's what I know:\n\n" + self._get_quick_stats(),
                "fallback"
            )
        return self._reply(
            "I couldn't understand that question. Try asking about:\n"
            "• Transactions, accounts, fraud rings\n"
            "• Suspicious accounts, risk scores\n"
            "• Specific accounts (e.g., ACC401) or rings (e.g., RING_001)\n"
            "• Type **help** for all available commands.",
            "fallback"
        )

    # ── Helpers ──────────────────────────────────────────────────────────

    def _get_quick_stats(self) -> str:
        parts = []
        if self.dataset_summary:
            parts.append(f"📊 {self.dataset_summary.get('total_transactions', 0):,} transactions, "
                         f"{self.dataset_summary.get('unique_accounts', 0)} accounts")
        if self.fraud_results:
            parts.append(f"⚠️ {len(self.fraud_results.get('suspicious_accounts', []))} suspicious accounts, "
                         f"{len(self.fraud_results.get('fraud_rings', []))} fraud rings")
        return "\n".join(parts) if parts else "No data loaded yet."

    def _reply(self, text: str, category: str) -> Dict[str, Any]:
        return {
            "answer": text,
            "category": category,
            "has_data": self.dataset_summary is not None,
            "has_detection": self.fraud_results is not None,
        }
