(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ScopaLogic = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SUITS = [
    { key: "denari", label: "Denari", accent: "gold" },
    { key: "coppe", label: "Coppe", accent: "crimson" },
    { key: "spade", label: "Spade", accent: "ink" },
    { key: "bastoni", label: "Bastoni", accent: "olive" },
  ];

  var RANKS = [
    { value: 1, shortLabel: "1", label: "Asso", rankKey: "asso" },
    { value: 2, shortLabel: "2", label: "2", rankKey: "numero" },
    { value: 3, shortLabel: "3", label: "3", rankKey: "numero" },
    { value: 4, shortLabel: "4", label: "4", rankKey: "numero" },
    { value: 5, shortLabel: "5", label: "5", rankKey: "numero" },
    { value: 6, shortLabel: "6", label: "6", rankKey: "numero" },
    { value: 7, shortLabel: "7", label: "7", rankKey: "numero" },
    { value: 8, shortLabel: "F", label: "Fante", rankKey: "fante" },
    { value: 9, shortLabel: "C", label: "Cavallo", rankKey: "cavallo" },
    { value: 10, shortLabel: "R", label: "Re", rankKey: "re" },
  ];

  function cloneArray(items) {
    return items.slice();
  }

  function createDeck() {
    var deck = [];
    var id = 1;

    SUITS.forEach(function (suit) {
      RANKS.forEach(function (rank) {
        deck.push({
          id: "card-" + id,
          suit: suit.key,
          suitLabel: suit.label,
          accent: suit.accent,
          value: rank.value,
          shortLabel: rank.shortLabel,
          rankLabel: rank.label,
          rankKey: rank.rankKey,
          name: rank.label + " di " + suit.label,
        });
        id += 1;
      });
    });

    return deck;
  }

  function shuffle(cards, rng) {
    var random = typeof rng === "function" ? rng : Math.random;
    var deck = cloneArray(cards);
    var index = deck.length - 1;

    while (index > 0) {
      var swapIndex = Math.floor(random() * (index + 1));
      var current = deck[index];
      deck[index] = deck[swapIndex];
      deck[swapIndex] = current;
      index -= 1;
    }

    return deck;
  }

  function drawCards(deck, count) {
    return {
      drawn: deck.slice(0, count),
      deck: deck.slice(count),
    };
  }

  function sumValues(cards) {
    return cards.reduce(function (total, card) {
      return total + card.value;
    }, 0);
  }

  function toSummary(cards) {
    return cards
      .map(function (card) {
        return card.shortLabel + " " + card.suitLabel;
      })
      .join(", ");
  }

  function combinations(cards, minSize, maxSize) {
    var results = [];

    function walk(startIndex, buffer) {
      if (buffer.length >= minSize && buffer.length <= maxSize) {
        results.push(buffer.slice());
      }

      if (buffer.length === maxSize) {
        return;
      }

      for (var index = startIndex; index < cards.length; index += 1) {
        buffer.push(cards[index]);
        walk(index + 1, buffer);
        buffer.pop();
      }
    }

    walk(0, []);
    return results;
  }

  function typeLabel(type) {
    if (type === "match") {
      return "Coppia";
    }

    if (type === "sum") {
      return "Somma";
    }

    return "Somma speciale";
  }

  function createMove(handCard, selectedCards, type, tableSize) {
    return {
      handCardId: handCard.id,
      type: type,
      typeLabel: typeLabel(type),
      selectedIds: selectedCards.map(function (card) {
        return card.id;
      }),
      selectedSummary: toSummary(selectedCards),
      label:
        typeLabel(type) +
        ": " +
        handCard.shortLabel +
        " " +
        handCard.suitLabel +
        " prende " +
        toSummary(selectedCards),
      capturesAll: selectedCards.length === tableSize,
      captureCount: selectedCards.length,
    };
  }

  function dedupeMoves(moves) {
    var seen = {};
    return moves.filter(function (move) {
      var key = move.type + "|" + move.selectedIds.slice().sort().join("|");
      if (seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function compareMoves(left, right) {
    var typePriority = { match: 0, sum: 1, special: 2 };

    if (left.capturesAll !== right.capturesAll) {
      return right.capturesAll ? 1 : -1;
    }

    if (left.captureCount !== right.captureCount) {
      return right.captureCount - left.captureCount;
    }

    if (typePriority[left.type] !== typePriority[right.type]) {
      return typePriority[left.type] - typePriority[right.type];
    }

    return left.label.localeCompare(right.label);
  }

  function findMatchMoves(handCard, tableCards) {
    return tableCards
      .filter(function (card) {
        return card.value === handCard.value;
      })
      .map(function (card) {
        return createMove(handCard, [card], "match", tableCards.length);
      });
  }

  function findPairSumMoves(handCard, tableCards) {
    return combinations(tableCards, 2, 2)
      .filter(function (cards) {
        return sumValues(cards) === handCard.value;
      })
      .map(function (cards) {
        return createMove(handCard, cards, "sum", tableCards.length);
      });
  }

  function findSpecialMoves(handCard, tableCards) {
    var specialMoves = [];

    tableCards.forEach(function (targetCard) {
      var others = tableCards.filter(function (card) {
        return card.id !== targetCard.id;
      });

      combinations(others, 1, others.length).forEach(function (group) {
        if (handCard.value + sumValues(group) === targetCard.value) {
          specialMoves.push(
            createMove(
              handCard,
              [targetCard].concat(group),
              "special",
              tableCards.length
            )
          );
        }
      });
    });

    return specialMoves;
  }

  function getValidMovesForCard(handCard, tableCards) {
    return dedupeMoves(
      findMatchMoves(handCard, tableCards)
        .concat(findPairSumMoves(handCard, tableCards))
        .concat(findSpecialMoves(handCard, tableCards))
    ).sort(compareMoves);
  }

  function getAllValidMoves(handCards, tableCards) {
    return handCards
      .reduce(function (moves, handCard) {
        return moves.concat(getValidMovesForCard(handCard, tableCards));
      }, [])
      .sort(compareMoves);
  }

  function classifySelection(handCard, selectedCards) {
    if (!handCard) {
      return { valid: false, reason: "Seleziona una carta dalla mano." };
    }

    if (!selectedCards || selectedCards.length === 0) {
      return { valid: false, reason: "Seleziona almeno una carta dal tavolo." };
    }

    if (
      selectedCards.length === 1 &&
      selectedCards[0].value === handCard.value
    ) {
      return {
        valid: true,
        type: "match",
        typeLabel: typeLabel("match"),
        summary: "Coppia sullo stesso valore.",
      };
    }

    if (selectedCards.length === 2 && sumValues(selectedCards) === handCard.value) {
      return {
        valid: true,
        type: "sum",
        typeLabel: typeLabel("sum"),
        summary: "Somma di due carte del tavolo.",
      };
    }

    if (selectedCards.length >= 2) {
      var specialTarget = selectedCards.find(function (targetCard) {
        var otherCards = selectedCards.filter(function (card) {
          return card.id !== targetCard.id;
        });

        return handCard.value + sumValues(otherCards) === targetCard.value;
      });

      if (specialTarget) {
        return {
          valid: true,
          type: "special",
          typeLabel: typeLabel("special"),
          summary:
            "Somma speciale: " +
            specialTarget.shortLabel +
            " vale la carta in mano piu le altre selezionate.",
        };
      }
    }

    return {
      valid: false,
      reason: "La selezione non rispetta nessuna presa valida.",
    };
  }

  function createInitialState(rng) {
    var deck = shuffle(createDeck(), rng);
    var firstTable = drawCards(deck, 4);
    var firstHand = drawCards(firstTable.deck, 3);

    return {
      deck: firstHand.deck,
      hand: firstHand.drawn,
      table: firstTable.drawn,
      captured: [],
      scopeCount: 0,
      turnCount: 0,
      log: [
        {
          id: "move-0",
          title: "Partita iniziata",
          detail:
            "Tavolo con 4 carte e mano iniziale da 3 carte. Cerca di svuotare il tavolo il piu possibile.",
          scopa: false,
        },
      ],
      lastMove: null,
      gameOver: false,
    };
  }

  function logEntry(id, title, detail, scopa) {
    return {
      id: id,
      title: title,
      detail: detail,
      scopa: Boolean(scopa),
    };
  }

  function applyMove(state, payload) {
    var handCardId = payload.handCardId;
    var selectedTableIds = payload.selectedTableIds || [];
    var handCard = state.hand.find(function (card) {
      return card.id === handCardId;
    });

    if (!handCard) {
      return {
        ok: false,
        error: "La carta selezionata non e presente nella mano.",
        state: state,
      };
    }

    var selectedCards = selectedTableIds
      .map(function (selectedId) {
        return state.table.find(function (tableCard) {
          return tableCard.id === selectedId;
        });
      })
      .filter(Boolean);

    if (selectedTableIds.length !== selectedCards.length) {
      return {
        ok: false,
        error: "Una o piu carte selezionate non sono presenti sul tavolo.",
        state: state,
      };
    }

    var availableMoves = getValidMovesForCard(handCard, state.table);

    if (selectedCards.length === 0 && availableMoves.length > 0) {
      return {
        ok: false,
        error: "Questa carta puo fare presa: scegli una delle combinazioni valide.",
        state: state,
      };
    }

    var nextState = {
      deck: cloneArray(state.deck),
      hand: cloneArray(state.hand),
      table: cloneArray(state.table),
      captured: cloneArray(state.captured),
      scopeCount: state.scopeCount,
      turnCount: state.turnCount + 1,
      log: cloneArray(state.log),
      lastMove: null,
      gameOver: false,
    };

    nextState.hand = nextState.hand.filter(function (card) {
      return card.id !== handCard.id;
    });

    var moveTitle;
    var moveDetail;
    var isScopa = false;
    var evaluation = null;

    if (selectedCards.length > 0) {
      evaluation = classifySelection(handCard, selectedCards);

      if (!evaluation.valid) {
        return {
          ok: false,
          error: evaluation.reason,
          state: state,
        };
      }

      nextState.table = nextState.table.filter(function (card) {
        return selectedTableIds.indexOf(card.id) === -1;
      });

      nextState.captured = nextState.captured.concat([handCard]).concat(selectedCards);
      isScopa = nextState.table.length === 0;

      if (isScopa) {
        nextState.scopeCount += 1;
      }

      moveTitle = evaluation.typeLabel + (isScopa ? " con Scopa" : "");
      moveDetail =
        handCard.shortLabel +
        " " +
        handCard.suitLabel +
        " prende " +
        toSummary(selectedCards) +
        ".";
    } else {
      nextState.table = nextState.table.concat(handCard);
      moveTitle = "Carta al tavolo";
      moveDetail =
        handCard.shortLabel +
        " " +
        handCard.suitLabel +
        " viene lasciata sul tavolo.";
    }

    var drawDetail = "";
    if (nextState.hand.length === 0 && nextState.deck.length > 0) {
      var refill = drawCards(nextState.deck, Math.min(3, nextState.deck.length));
      nextState.hand = refill.drawn;
      nextState.deck = refill.deck;
      drawDetail =
        " Nuova mano da " + refill.drawn.length + " carte pescata dal mazzo.";
    }

    if (nextState.hand.length === 0 && nextState.deck.length === 0) {
      nextState.gameOver = true;
      drawDetail +=
        " Partita finita con " + nextState.table.length + " carte ancora sul tavolo.";
    }

    var turnId = "move-" + nextState.turnCount;
    nextState.lastMove = logEntry(turnId, moveTitle, moveDetail + drawDetail, isScopa);
    nextState.log.unshift(nextState.lastMove);

    return {
      ok: true,
      state: nextState,
      moveResult: {
        title: moveTitle,
        detail: moveDetail + drawDetail,
        scopa: isScopa,
        evaluation: evaluation,
      },
    };
  }

  function getRecommendedMove(handCards, tableCards) {
    var moves = getAllValidMoves(handCards, tableCards);
    return moves.length > 0 ? moves[0] : null;
  }

  return {
    SUITS: SUITS,
    RANKS: RANKS,
    createDeck: createDeck,
    createInitialState: createInitialState,
    classifySelection: classifySelection,
    getValidMovesForCard: getValidMovesForCard,
    getAllValidMoves: getAllValidMoves,
    getRecommendedMove: getRecommendedMove,
    applyMove: applyMove,
  };
});
